import { z } from "zod";

import { entityStatusSchema, uuidSchema } from "./common";

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
  })
  .refine((val) => !val.startDate || !val.endDate || val.startDate <= val.endDate, {
    message: "Start Date không được lớn hơn End Date.",
    path: ["endDate"],
  });

export type CreateProductAssignmentInput = z.infer<typeof createProductAssignmentSchema>;
export type UpdateProductAssignmentInput = z.infer<typeof updateProductAssignmentSchema>;
