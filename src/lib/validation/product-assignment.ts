import { z } from "zod";

import { entityStatusSchema, expectedUpdatedAtSchema, uuidSchema } from "./common";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD");

export const createProductAssignmentSchema = z
  .object({
    positionId: uuidSchema,
    productId: uuidSchema,
    // >= 1, không phải >= 0 như Part 08 §21 gốc — xem CLAUDE.md quyết định #6.
    facingQty: z.number().int().min(1, "Facing Quantity phải >= 1"),
    displayOrder: z.number().int().default(0),
    startDate: dateOnly.optional(),
    endDate: dateOnly.optional(),
  })
  .refine((val) => !val.startDate || !val.endDate || val.startDate <= val.endDate, {
    message: "Start Date không được lớn hơn End Date.",
    path: ["endDate"],
  });

export const updateProductAssignmentSchema = z
  .object({
    facingQty: z.number().int().min(1, "Facing Quantity phải >= 1").optional(),
    displayOrder: z.number().int().optional(),
    startDate: dateOnly.nullable().optional(),
    endDate: dateOnly.nullable().optional(),
    status: entityStatusSchema.optional(),
    expectedUpdatedAt: expectedUpdatedAtSchema,
  })
  .refine((val) => !val.startDate || !val.endDate || val.startDate <= val.endDate, {
    message: "Start Date không được lớn hơn End Date.",
    path: ["endDate"],
  });

/**
 * Gán hàng loạt — user chọn 1 Product rồi bấm lần lượt các ô trên canvas.
 * Draft giữ ở Frontend, chỉ ghi DB 1 lần khi bấm Lưu (nguyên tắc #1).
 *
 * Lỗi Zod ở đây sinh path dạng `items.3.facingQty`, trùng đúng định dạng mà
 * Service dựng cho lỗi nghiệp vụ — client chỉ cần 1 cách parse cho cả hai.
 */
export const bulkAssignItemSchema = z.object({
  positionId: uuidSchema,
  productId: uuidSchema,
  facingQty: z.number().int().min(1, "Facing Quantity phải >= 1"),
  displayOrder: z.number().int().default(0),
});

export const MAX_BULK_ASSIGN_ITEMS = 200;

export const bulkCreateProductAssignmentSchema = z
  .object({
    // Mang theo surfaceId để Service chặn được draft cũ ghi nhầm sang Surface khác.
    surfaceId: uuidSchema,
    items: z
      .array(bulkAssignItemSchema)
      .min(1, "Phải có ít nhất 1 Display Position.")
      .max(
        MAX_BULK_ASSIGN_ITEMS,
        `Tối đa ${MAX_BULK_ASSIGN_ITEMS} vị trí trong 1 lần lưu — hãy Lưu rồi gán tiếp.`
      ),
  })
  .refine((val) => new Set(val.items.map((i) => i.positionId)).size === val.items.length, {
    message: "Danh sách có Display Position trùng lặp.",
    path: ["items"],
  });

export type CreateProductAssignmentInput = z.infer<typeof createProductAssignmentSchema>;
export type UpdateProductAssignmentInput = z.infer<typeof updateProductAssignmentSchema>;
export type BulkCreateProductAssignmentInput = z.infer<typeof bulkCreateProductAssignmentSchema>;
