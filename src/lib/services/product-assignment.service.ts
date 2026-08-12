import { and, desc, eq } from "drizzle-orm";

import { AppError, NotFoundError, ValidationError } from "../api/errors";
import { assertNotStale } from "./concurrency";
import { db } from "../db/client";
import { displayPosition, product, productAssignment } from "../db/schema";
import type { AssignmentWithProduct } from "../types/entities";
import type {
  CreateProductAssignmentInput,
  UpdateProductAssignmentInput,
} from "../validation/product-assignment";

export async function listProductAssignments(positionId: string, includeArchived = false) {
  return db
    .select()
    .from(productAssignment)
    .where(
      includeArchived
        ? eq(productAssignment.positionId, positionId)
        : and(eq(productAssignment.positionId, positionId), eq(productAssignment.status, "Active"))
    )
    .orderBy(desc(productAssignment.createdAt));
}

export async function getProductAssignment(assignmentId: string) {
  const [row] = await db
    .select()
    .from(productAssignment)
    .where(eq(productAssignment.assignmentId, assignmentId));
  if (!row) throw new NotFoundError("Product Assignment");
  return row;
}

/**
 * Giai đoạn 8 A2: lấy toàn bộ Active Assignment + Product của một Surface trong
 * một query duy nhất. Thay thế pattern N+1 (useProductAssignments per-position)
 * trong DisplayPositionShape ở workspace.tsx.
 */
export async function listActiveAssignmentsBySurface(
  surfaceId: string
): Promise<AssignmentWithProduct[]> {
  const rows = await db
    .select({
      // ProductAssignment fields
      assignmentId: productAssignment.assignmentId,
      positionId: productAssignment.positionId,
      productId: productAssignment.productId,
      facingQty: productAssignment.facingQty,
      displayOrder: productAssignment.displayOrder,
      startDate: productAssignment.startDate,
      endDate: productAssignment.endDate,
      status: productAssignment.status,
      createdAt: productAssignment.createdAt,
      updatedAt: productAssignment.updatedAt,
      // Product fields (joined)
      product: {
        productId: product.productId,
        itemCode: product.itemCode,
        description: product.description,
        category: product.category,
        productGroup: product.productGroup,
        brand: product.brand,
        imageUrl: product.imageUrl,
        widthMm: product.widthMm,
        heightMm: product.heightMm,
        depthMm: product.depthMm,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    })
    .from(productAssignment)
    .innerJoin(product, eq(productAssignment.productId, product.productId))
    .innerJoin(displayPosition, eq(productAssignment.positionId, displayPosition.positionId))
    .where(
      and(
        eq(displayPosition.surfaceId, surfaceId),
        eq(productAssignment.status, "Active"),
        eq(displayPosition.status, "Active")
      )
    );

  // Drizzle trả Date objects cho timestamp columns, nhưng entities.ts khai báo
  // createdAt/updatedAt là string (được serialize bởi JSON.stringify khi qua API).
  // Ở đây cast qua unknown để thoát type mismatch — đúng hành vi runtime.
  return rows as unknown as AssignmentWithProduct[];
}

export async function createProductAssignment(input: CreateProductAssignmentInput) {
  // Part 08 §18 — Resource Existence Rule: cả Position và Product phải tồn tại.
  const [position] = await db
    .select({ status: displayPosition.status, facingLimit: displayPosition.facingLimit })
    .from(displayPosition)
    .where(eq(displayPosition.positionId, input.positionId));
  if (!position) throw new NotFoundError("Display Position");
  if (position.status !== "Active") {
    throw new AppError(
      "Không thể gán Product vào một Display Position đã Archived.",
      422,
      "PARENT_NOT_ACTIVE"
    );
  }

  const [productRow] = await db
    .select({ status: product.status })
    .from(product)
    .where(eq(product.productId, input.productId));
  if (!productRow) throw new NotFoundError("Product");
  if (productRow.status !== "Active") {
    throw new AppError("Không thể gán một Product đã Archived.", 422, "PRODUCT_NOT_ACTIVE");
  }

  // CLAUDE.md quyết định #6 — facing_qty <= facing_limit khi facing_limit có
  // giá trị. Cross-table nên enforce ở Service layer, không phải DB CHECK.
  if (position.facingLimit !== null && input.facingQty > position.facingLimit) {
    throw new ValidationError(
      [
        {
          field: "facingQty",
          code: "EXCEEDS_FACING_LIMIT",
          message: `Facing Quantity (${input.facingQty}) vượt quá Facing Limit của Display Position (${position.facingLimit}).`,
        },
      ],
      "Facing Quantity vượt quá giới hạn cho phép."
    );
  }

  // Part 08 §19 — 1 Position chỉ có tối đa 1 Active Assignment. DB partial
  // unique index (uq_assignment_active_position) là final protection; lỗi
  // 23505 được dịch sang 409 CONFLICT ở errors.ts.
  const [row] = await db
    .insert(productAssignment)
    .values({
      positionId: input.positionId,
      productId: input.productId,
      facingQty: input.facingQty,
      displayOrder: input.displayOrder,
      startDate: input.startDate,
      endDate: input.endDate,
    })
    .returning();
  return row;
}

export async function updateProductAssignment(
  assignmentId: string,
  input: UpdateProductAssignmentInput
) {
  const existing = await getProductAssignment(assignmentId);
  const { expectedUpdatedAt, ...fields } = input;
  assertNotStale(expectedUpdatedAt, existing.updatedAt);

  if (
    input.facingQty !== undefined &&
    input.status !== "Archived"
  ) {
    const [position] = await db
      .select({ facingLimit: displayPosition.facingLimit })
      .from(displayPosition)
      .where(eq(displayPosition.positionId, existing.positionId));
    if (position?.facingLimit !== null && position?.facingLimit !== undefined && input.facingQty > position.facingLimit) {
      throw new ValidationError(
        [
          {
            field: "facingQty",
            code: "EXCEEDS_FACING_LIMIT",
            message: `Facing Quantity (${input.facingQty}) vượt quá Facing Limit của Display Position (${position.facingLimit}).`,
          },
        ],
        "Facing Quantity vượt quá giới hạn cho phép."
      );
    }
  }

  const [row] = await db
    .update(productAssignment)
    .set(fields)
    .where(eq(productAssignment.assignmentId, assignmentId))
    .returning();
  return row;
}
