import { z } from "zod";

import { entityStatusSchema } from "./common";

export const createRetailerSchema = z.object({
  retailerCode: z.string().trim().min(1, "Retailer Code là bắt buộc"),
  retailerName: z.string().trim().min(1, "Retailer Name là bắt buộc"),
});

export const updateRetailerSchema = z.object({
  retailerCode: z.string().trim().min(1).optional(),
  retailerName: z.string().trim().min(1).optional(),
  status: entityStatusSchema.optional(),
});

export type CreateRetailerInput = z.infer<typeof createRetailerSchema>;
export type UpdateRetailerInput = z.infer<typeof updateRetailerSchema>;
