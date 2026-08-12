import { and, desc, eq, inArray } from "drizzle-orm";

import { AppError, NotFoundError, ValidationError, type FieldError } from "../api/errors";
import { assertNotStale } from "./concurrency";
import { db } from "../db/client";
import { displayPosition, product, productAssignment, surface } from "../db/schema";
import type { AssignmentWithProduct } from "../types/entities";
import type {
  BulkCreateProductAssignmentInput,
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

/**
 * Gán hàng loạt — nhận N cặp (Display Position, Product) từ Draft ở Frontend và
 * ghi trong 1 transaction.
 *
 * Nguyên tắc: validate TOÀN BỘ trước, có bất kỳ lỗi nào thì KHÔNG ghi gì cả
 * (all-or-nothing). Một planogram ghi được nửa chừng tệ hơn là bắt user thử lại.
 * Lỗi trả về theo từng item với `field` dạng `items.<index>.<field>` để UI tô đỏ
 * đúng ô nào sai — trùng định dạng path mà Zod tự sinh.
 *
 * 5 query cố định bất kể bao nhiêu item, không N+1.
 */
export async function bulkCreateProductAssignments(input: BulkCreateProductAssignmentInput) {
  const { surfaceId, items } = input;
  const positionIds = items.map((i) => i.positionId);
  const productIds = [...new Set(items.map((i) => i.productId))];

  // (1) Surface phải tồn tại + Active — kiểm cả request, không phải per-item.
  const [surfaceRow] = await db
    .select({ status: surface.status })
    .from(surface)
    .where(eq(surface.surfaceId, surfaceId));
  if (!surfaceRow) throw new NotFoundError("Surface");
  if (surfaceRow.status !== "Active") {
    throw new AppError(
      "Không thể gán Product vào một Surface đã Archived.",
      422,
      "PARENT_NOT_ACTIVE"
    );
  }

  // (2) Toàn bộ Display Position trong 1 query.
  const positionRows = await db
    .select({
      positionId: displayPosition.positionId,
      surfaceId: displayPosition.surfaceId,
      status: displayPosition.status,
      facingLimit: displayPosition.facingLimit,
    })
    .from(displayPosition)
    .where(inArray(displayPosition.positionId, positionIds));
  const positionById = new Map(positionRows.map((p) => [p.positionId, p]));

  // (3) Toàn bộ Product trong 1 query.
  const productRows = await db
    .select({ productId: product.productId, status: product.status })
    .from(product)
    .where(inArray(product.productId, productIds));
  const productById = new Map(productRows.map((p) => [p.productId, p]));

  // (4) Position nào đã có Active Assignment rồi.
  const existingRows = await db
    .select({ positionId: productAssignment.positionId })
    .from(productAssignment)
    .where(
      and(
        inArray(productAssignment.positionId, positionIds),
        eq(productAssignment.status, "Active")
      )
    );
  const occupied = new Set(existingRows.map((r) => r.positionId));

  // (5) Gom mọi lỗi, không dừng ở lỗi đầu tiên — user sửa được 1 lượt.
  const errors: FieldError[] = [];
  items.forEach((item, idx) => {
    const position = positionById.get(item.positionId);
    if (!position) {
      errors.push({
        field: `items.${idx}.positionId`,
        code: "NOT_FOUND",
        message: "Display Position không tồn tại.",
      });
      return;
    }
    if (position.status !== "Active") {
      errors.push({
        field: `items.${idx}.positionId`,
        code: "PARENT_NOT_ACTIVE",
        message: "Display Position đã Archived.",
      });
    }
    if (position.surfaceId !== surfaceId) {
      errors.push({
        field: `items.${idx}.positionId`,
        code: "POSITION_NOT_IN_SURFACE",
        message: "Display Position không thuộc Surface đang mở.",
      });
    }
    if (occupied.has(item.positionId)) {
      errors.push({
        field: `items.${idx}.positionId`,
        code: "ACTIVE_ASSIGNMENT_EXISTS",
        message: "Display Position này đã có Product Assignment Active.",
      });
    }
    // CLAUDE.md quyết định #6 — cross-table nên enforce ở Service layer.
    // Viết rõ cả null lẫn undefined: facingLimit nullable trong DB.
    if (
      position.facingLimit !== null &&
      position.facingLimit !== undefined &&
      item.facingQty > position.facingLimit
    ) {
      errors.push({
        field: `items.${idx}.facingQty`,
        code: "EXCEEDS_FACING_LIMIT",
        message: `Facing Quantity (${item.facingQty}) vượt quá Facing Limit của Display Position (${position.facingLimit}).`,
      });
    }

    const productRow = productById.get(item.productId);
    if (!productRow) {
      errors.push({
        field: `items.${idx}.productId`,
        code: "NOT_FOUND",
        message: "Product không tồn tại.",
      });
    } else if (productRow.status !== "Active") {
      errors.push({
        field: `items.${idx}.productId`,
        code: "PRODUCT_NOT_ACTIVE",
        message: "Không thể gán một Product đã Archived.",
      });
    }
  });

  if (errors.length > 0) {
    const badItems = new Set(errors.map((e) => e.field.split(".")[1])).size;
    throw new ValidationError(
      errors,
      `${badItems}/${items.length} vị trí không hợp lệ — chưa có gì được lưu.`
    );
  }

  // (6) Sạch rồi mới ghi. INSERT nhiều dòng vốn đã atomic; bọc transaction để
  // đúng pattern chung của repo và sẵn sàng cho bước ghi thứ hai sau này.
  // Race với user khác chen vào giữa (4) và đây → unique index bắn 23505,
  // translatePostgresError dịch sang 409. KHÔNG dùng onConflictDoNothing vì nó
  // âm thầm bỏ item mà vẫn báo thành công.
  const created = await db.transaction(async (tx) =>
    tx
      .insert(productAssignment)
      .values(
        items.map((i) => ({
          positionId: i.positionId,
          productId: i.productId,
          facingQty: i.facingQty,
          displayOrder: i.displayOrder,
        }))
      )
      .returning()
  );

  return { created, createdCount: created.length };
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
