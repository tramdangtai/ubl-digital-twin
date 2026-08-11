import { z } from "zod";

import { OWNER_COMPANIES } from "@/lib/constants";

import { entityStatusSchema, expectedUpdatedAtSchema, uuidSchema } from "./common";

/** Part 08 §11 — Phase 1 hỗ trợ tối thiểu 2 giá trị. */
export const ownerCompanySchema = z.enum(OWNER_COMPANIES);

export const createFixtureSchema = z.object({
  storeId: uuidSchema,
  fixtureCode: z.string().trim().min(1, "Fixture Code là bắt buộc"),
  fixtureName: z.string().trim().min(1, "Fixture Name là bắt buộc"),
  ownerCompany: ownerCompanySchema,
  fixtureType: z.string().trim().optional(),
  widthMm: z.number().positive("Width phải lớn hơn 0"),
  heightMm: z.number().positive("Height phải lớn hơn 0"),
  depthMm: z.number().positive("Depth phải lớn hơn 0"),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  rotationDegree: z.number().min(0).max(360).default(0),
});

export const updateFixtureSchema = z.object({
  fixtureCode: z.string().trim().min(1).optional(),
  fixtureName: z.string().trim().min(1).optional(),
  ownerCompany: ownerCompanySchema.optional(),
  fixtureType: z.string().trim().optional(),
  widthMm: z.number().positive("Width phải lớn hơn 0").optional(),
  heightMm: z.number().positive("Height phải lớn hơn 0").optional(),
  depthMm: z.number().positive("Depth phải lớn hơn 0").optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  rotationDegree: z.number().min(0).max(360).optional(),
  status: entityStatusSchema.optional(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type CreateFixtureInput = z.infer<typeof createFixtureSchema>;
export type UpdateFixtureInput = z.infer<typeof updateFixtureSchema>;
