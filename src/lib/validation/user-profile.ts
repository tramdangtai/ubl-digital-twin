import { z } from "zod";

import { entityStatusSchema, expectedUpdatedAtSchema } from "./common";

/** CLAUDE.md quyết định #1 — role model Phase 1. */
export const userRoleSchema = z.enum(["Admin", "Editor", "Viewer"]);

export const createUserSchema = z.object({
  email: z.email({ message: "Email không hợp lệ" }),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
  fullName: z.string().trim().optional(),
  role: userRoleSchema,
});

export const updateUserSchema = z.object({
  role: userRoleSchema.optional(),
  status: entityStatusSchema.optional(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
