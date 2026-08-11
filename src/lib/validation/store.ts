import { z } from "zod";

import { entityStatusSchema, expectedUpdatedAtSchema, uuidSchema } from "./common";

export const createStoreSchema = z.object({
  retailerId: uuidSchema,
  storeCode: z.string().trim().min(1, "Store Code là bắt buộc"),
  storeName: z.string().trim().min(1, "Store Name là bắt buộc"),
  address: z.string().trim().optional(),
});

export const updateStoreSchema = z.object({
  storeCode: z.string().trim().min(1).optional(),
  storeName: z.string().trim().min(1).optional(),
  address: z.string().trim().optional(),
  status: entityStatusSchema.optional(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
