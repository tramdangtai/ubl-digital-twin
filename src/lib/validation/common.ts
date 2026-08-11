import { z } from "zod";

/** Part 03 §2.4 / TD-05 §14 — Phase 1 chỉ có 2 trạng thái. */
export const entityStatusSchema = z.enum(["Active", "Archived"]);

export const uuidSchema = z.uuid({ message: "ID không hợp lệ" });

/**
 * Optimistic concurrency (CLAUDE.md quyết định #9): client gửi kèm updatedAt
 * đã tải để Service so sánh với DB, khác nhau -> 409 Conflict. Không dùng
 * z.iso.datetime() strict vì chỉ cần so sánh giá trị thời điểm, không cần ép
 * đúng 1 định dạng ISO cụ thể.
 */
export const expectedUpdatedAtSchema = z.string().optional();
