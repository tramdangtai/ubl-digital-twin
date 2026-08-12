import { z } from "zod";

import { entityStatusSchema, expectedUpdatedAtSchema, uuidSchema } from "./common";
import { backgroundFitSchema } from "./background-image";

/** Part 03 §7 — Phase 1 chỉ hỗ trợ 5 orientation. */
export const surfaceOrientationSchema = z.enum(["Front", "Back", "Left", "Right", "Top"]);

export const createSurfaceSchema = z.object({
  fixtureId: uuidSchema,
  surfaceName: z.string().trim().optional(),
  orientation: surfaceOrientationSchema,
  widthMm: z.number().positive("Width phải lớn hơn 0"),
  heightMm: z.number().positive("Height phải lớn hơn 0"),
  sortOrder: z.number().int().default(0),
});

export const updateSurfaceSchema = z.object({
  surfaceName: z.string().trim().optional(),
  widthMm: z.number().positive("Width phải lớn hơn 0").optional(),
  heightMm: z.number().positive("Height phải lớn hơn 0").optional(),
  sortOrder: z.number().int().optional(),
  status: entityStatusSchema.optional(),
  // Giai đoạn 9 — ảnh nền (quyết định E2: Editor + Admin có thể đổi, Viewer không):
  // null = gỡ ảnh nền, UUID = gán ảnh nền. undefined = không đổi.
  backgroundImageId: uuidSchema.nullable().optional(),
  backgroundOpacity: z.number().min(0).max(1).optional(),
  backgroundFit: backgroundFitSchema.optional(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type CreateSurfaceInput = z.infer<typeof createSurfaceSchema>;
export type UpdateSurfaceInput = z.infer<typeof updateSurfaceSchema>;
