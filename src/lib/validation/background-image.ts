import { z } from "zod";

import { entityStatusSchema, expectedUpdatedAtSchema } from "./common";

export const BACKGROUND_FITS = ["contain", "cover", "stretch"] as const;
export type BackgroundFit = typeof BACKGROUND_FITS[number];
export const backgroundFitSchema = z.enum(BACKGROUND_FITS);

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB — Vercel body limit ~4.5 MB
export const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedMime = typeof ALLOWED_MIME[number];

export const createBackgroundImageSchema = z.object({
  label: z.string().trim().min(1, "Label là bắt buộc").max(120, "Label tối đa 120 ký tự"),
});

export const updateBackgroundImageSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  status: entityStatusSchema.optional(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export type CreateBackgroundImageInput = z.infer<typeof createBackgroundImageSchema>;
export type UpdateBackgroundImageInput = z.infer<typeof updateBackgroundImageSchema>;

/**
 * Kiểm magic bytes (12 byte đầu tiên) — không tin header MIME client gửi lên.
 * Quyết định E7: kiểm cả magic bytes, không chỉ tin MIME client khai.
 */
export function checkMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));

  switch (mimeType) {
    case "image/png":
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      return (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );
    case "image/jpeg":
      // JPEG: FF D8 FF
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/webp":
      // WEBP: byte 0-3 = "RIFF", byte 8-11 = "WEBP"
      return (
        bytes[0] === 0x52 && // R
        bytes[1] === 0x49 && // I
        bytes[2] === 0x46 && // F
        bytes[3] === 0x46 && // F
        bytes[8] === 0x57 && // W
        bytes[9] === 0x45 && // E
        bytes[10] === 0x42 && // B
        bytes[11] === 0x50   // P
      );
    default:
      return false;
  }
}
