import { and, desc, eq } from "drizzle-orm";

import { AppError, NotFoundError, ValidationError } from "../api/errors";
import { db } from "../db/client";
import { displayPosition, product, productAssignment } from "../db/schema";
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
    .set(input)
    .where(eq(productAssignment.assignmentId, assignmentId))
    .returning();
  return row;
}
