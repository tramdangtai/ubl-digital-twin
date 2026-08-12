import { z } from "zod";

import { entityStatusSchema, expectedUpdatedAtSchema } from "./common";

/**
 * Giai đoạn 8 B: imageUrl phải là URL http(s) hoặc chuỗi rỗng.
 * Từ chối "javascript:...", "data:...", v.v. để tránh XSS.
 * Max 2048 ký tự (giới hạn thực tế của URL).
 */
const imageUrlSchema = z
  .string()
  .trim()
  .max(2048, "Image URL không được vượt 2048 ký tự")
  .refine(
    (v) => v === "" || /^https?:\/\//i.test(v),
    "Image URL phải bắt đầu bằng http:// hoặc https://"
  )
  .optional();

export const createProductSchema = z.object({
  itemCode: z.string().trim().min(1, "Item Code là bắt buộc"),
  description: z.string().trim().min(1, "Description là bắt buộc"),
  category: z.string().trim().optional(),
  productGroup: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  imageUrl: imageUrlSchema,
  // CLAUDE.md quyết định #7 — bổ sung so với Part 03 gốc.
  widthMm: z.number().positive("Width phải lớn hơn 0").optional(),
  heightMm: z.number().positive("Height phải lớn hơn 0").optional(),
  depthMm: z.number().positive("Depth phải lớn hơn 0").optional(),
});

export const updateProductSchema = z.object({
  itemCode: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  category: z.string().trim().optional(),
  productGroup: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  // nullable() cho phép gửi null để xoá ảnh (thay vì chỉ set "").
  imageUrl: imageUrlSchema.nullable(),
  widthMm: z.number().positive("Width phải lớn hơn 0").nullable().optional(),
  heightMm: z.number().positive("Height phải lớn hơn 0").nullable().optional(),
  depthMm: z.number().positive("Depth phải lớn hơn 0").nullable().optional(),
  status: entityStatusSchema.optional(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

/** Quyết định #10 — quy mô nhỏ (~4000 SKU), offset pagination là đủ. */
export const listProductsQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  includeArchived: z.coerce.boolean().default(false),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
