import { z } from "zod";

/** Part 03 §2.4 / TD-05 §14 — Phase 1 chỉ có 2 trạng thái. */
export const entityStatusSchema = z.enum(["Active", "Archived"]);

export const uuidSchema = z.uuid({ message: "ID không hợp lệ" });
