import type { NextRequest } from "next/server";

import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { apiCreated, apiError, apiSuccess } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import {
  createBackgroundImage,
  listBackgroundImages,
} from "@/lib/services/background-image.service";
import {
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
  checkMagicBytes,
  createBackgroundImageSchema,
} from "@/lib/validation/background-image";
import type { AllowedMime } from "@/lib/validation/background-image";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const includeArchived = request.nextUrl.searchParams.get("include_archived") === "true";
    const data = await listBackgroundImages(includeArchived);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * POST /api/background-images — Admin only.
 * Body: multipart/form-data với fields:
 *   - file: File (ảnh đã resize phía client, tối đa 4 MB)
 *   - label: string
 *   - width_px: string (số nguyên, kích thước sau resize)
 *   - height_px: string
 */
export async function POST(request: NextRequest) {
  try {
    const me = await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file");
    const label = formData.get("label");
    const widthPxRaw = formData.get("width_px");
    const heightPxRaw = formData.get("height_px");

    if (!(file instanceof File)) {
      throw new AppError("Thiếu file ảnh.", 422, "MISSING_FILE");
    }

    // Kiểm MIME type (client khai).
    const mimeType = file.type;
    if (!(ALLOWED_MIME as readonly string[]).includes(mimeType)) {
      throw new AppError(
        `Chỉ chấp nhận PNG, JPEG, WEBP. Nhận được: ${mimeType}`,
        422,
        "INVALID_MIME"
      );
    }

    // Kiểm size.
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new AppError(
        `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB). Giới hạn: 4 MB.`,
        422,
        "FILE_TOO_LARGE"
      );
    }

    // Đọc bytes + kiểm magic bytes (không tin MIME client khai).
    const arrayBuffer = await file.arrayBuffer();
    const isValid = checkMagicBytes(arrayBuffer, mimeType);
    if (!isValid) {
      throw new AppError(
        "Nội dung file không khớp với định dạng khai báo. Có thể file bị hỏng hoặc giả mạo.",
        422,
        "MAGIC_BYTES_MISMATCH"
      );
    }

    // Validate label.
    const parsed = createBackgroundImageSchema.parse({ label: label ?? "" });

    const widthPx = widthPxRaw ? parseInt(String(widthPxRaw), 10) : null;
    const heightPx = heightPxRaw ? parseInt(String(heightPxRaw), 10) : null;

    const data = await createBackgroundImage({
      buffer: Buffer.from(arrayBuffer),
      mimeType: mimeType as AllowedMime,
      label: parsed.label,
      uploadedBy: me.userId,
      widthPx: Number.isFinite(widthPx) ? widthPx : null,
      heightPx: Number.isFinite(heightPx) ? heightPx : null,
    });

    return apiCreated(data, "Ảnh nền đã được upload.");
  } catch (err) {
    return apiError(err);
  }
}
