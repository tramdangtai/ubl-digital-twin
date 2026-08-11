import { z } from "zod";

import { entityStatusSchema, expectedUpdatedAtSchema, uuidSchema } from "./common";

/** Part 03 §8 — Phase 1 hỗ trợ 6 display type. */
export const displayTypeSchema = z.enum(["Shelf", "Hook", "Basket", "Tray", "Pegboard", "Other"]);

export const createDisplayPositionSchema = z.object({
  surfaceId: uuidSchema,
  displayType: displayTypeSchema,
  x: z.number(),
  y: z.number(),
  widthMm: z.number().positive("Width phải lớn hơn 0"),
  heightMm: z.number().positive("Height phải lớn hơn 0"),
  // CLAUDE.md quyết định #6.
  capacity: z.number().int().min(0, "Capacity phải >= 0").optional(),
  facingLimit: z.number().int().min(1, "Facing Limit phải >= 1").optional(),
  sortOrder: z.number().int().default(0),
});

export const updateDisplayPositionSchema = z.object({
  displayType: displayTypeSchema.optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  widthMm: z.number().positive("Width phải lớn hơn 0").optional(),
  heightMm: z.number().positive("Height phải lớn hơn 0").optional(),
  capacity: z.number().int().min(0).nullable().optional(),
  facingLimit: z.number().int().min(1).nullable().optional(),
  sortOrder: z.number().int().optional(),
  status: entityStatusSchema.optional(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type CreateDisplayPositionInput = z.infer<typeof createDisplayPositionSchema>;
export type UpdateDisplayPositionInput = z.infer<typeof updateDisplayPositionSchema>;

/**
 * Giai đoạn 3 — sinh N Display Position theo lưới rows x columns trong 1
 * Surface. Giới hạn rows*columns <= 500/lần gọi — tránh 1 request tạo hàng
 * nghìn record ngoài ý muốn; muốn nhiều hơn thì gọi bulk-generate nhiều lần
 * (mỗi lần vẫn qua Draft → Preview → Save như quy trình chuẩn).
 */
export const bulkGenerateDisplayPositionSchema = z
  .object({
    surfaceId: uuidSchema,
    displayType: displayTypeSchema,
    rows: z.number().int().min(1).max(50),
    columns: z.number().int().min(1).max(50),
    startX: z.number().default(0),
    startY: z.number().default(0),
    cellWidthMm: z.number().positive("Cell Width phải lớn hơn 0"),
    cellHeightMm: z.number().positive("Cell Height phải lớn hơn 0"),
    gapXMm: z.number().min(0).default(0),
    gapYMm: z.number().min(0).default(0),
    capacity: z.number().int().min(0).optional(),
    facingLimit: z.number().int().min(1).optional(),
  })
  .refine((val) => val.rows * val.columns <= 500, {
    message: "Tổng số Display Position (rows x columns) không được vượt quá 500 trong 1 lần tạo.",
    path: ["rows"],
  });

export type BulkGenerateDisplayPositionInput = z.infer<typeof bulkGenerateDisplayPositionSchema>;
