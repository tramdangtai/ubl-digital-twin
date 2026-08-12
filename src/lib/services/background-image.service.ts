import { asc, count, eq } from "drizzle-orm";
import crypto from "crypto";

import { NotFoundError } from "../api/errors";
import { assertNotStale } from "./concurrency";
import { db } from "../db/client";
import { backgroundImage, surface } from "../db/schema";
import { createAdminClient } from "../supabase/admin";
import { SURFACE_BACKGROUNDS_BUCKET } from "../storage/constants";
import type { UpdateBackgroundImageInput } from "../validation/background-image";

/**
 * Lấy extension từ MIME type.
 */
function mimeToExt(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    default: return "bin";
  }
}

export async function listBackgroundImages(includeArchived = false) {
  return db
    .select()
    .from(backgroundImage)
    .where(includeArchived ? undefined : eq(backgroundImage.status, "Active"))
    .orderBy(asc(backgroundImage.label));
}

export async function getBackgroundImage(id: string) {
  const [row] = await db
    .select()
    .from(backgroundImage)
    .where(eq(backgroundImage.backgroundImageId, id));
  if (!row) throw new NotFoundError("Background Image");
  return row;
}

/** Đếm số Surface đang dùng ảnh này — dùng để cảnh báo khi archive. */
export async function countSurfacesUsing(id: string): Promise<number> {
  const [row] = await db
    .select({ cnt: count() })
    .from(surface)
    .where(eq(surface.backgroundImageId, id));
  return row?.cnt ?? 0;
}

export interface CreateBackgroundImageInput {
  buffer: Buffer;
  mimeType: string;
  label: string;
  uploadedBy: string;
  widthPx?: number | null;
  heightPx?: number | null;
}

/**
 * Upload ảnh lên Storage, insert bản ghi DB.
 * Pattern "compensating cleanup": nếu insert DB thất bại sau khi upload
 * Storage thành công → xoá object vừa upload — copy từ createUser() trong user.service.ts.
 */
export async function createBackgroundImage(input: CreateBackgroundImageInput) {
  const ext = mimeToExt(input.mimeType);
  const storagePath = `${crypto.randomUUID()}.${ext}`;
  const adminClient = createAdminClient();

  // Bước 1: upload lên Storage.
  const { error: uploadError } = await adminClient.storage
    .from(SURFACE_BACKGROUNDS_BUCKET)
    .upload(storagePath, input.buffer, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload Storage thất bại: ${uploadError.message}`);
  }

  // Bước 2: insert DB. Nếu fail → xoá object vừa upload.
  try {
    const [row] = await db
      .insert(backgroundImage)
      .values({
        label: input.label,
        storagePath,
        mimeType: input.mimeType,
        fileSizeBytes: input.buffer.byteLength,
        widthPx: input.widthPx ?? null,
        heightPx: input.heightPx ?? null,
        uploadedBy: input.uploadedBy,
      })
      .returning();
    return row;
  } catch (e) {
    // Compensating cleanup — tương tự createUser() xoá Auth user khi profile insert thất bại.
    await adminClient.storage.from(SURFACE_BACKGROUNDS_BUCKET).remove([storagePath]);
    throw e;
  }
}

export async function updateBackgroundImage(id: string, input: UpdateBackgroundImageInput) {
  const existing = await getBackgroundImage(id);
  const { expectedUpdatedAt, ...fields } = input;
  assertNotStale(expectedUpdatedAt, existing.updatedAt);

  const [row] = await db
    .update(backgroundImage)
    .set(fields)
    .where(eq(backgroundImage.backgroundImageId, id))
    .returning();
  return row;
}

/** Tải bytes ảnh từ Storage — dùng cho route proxy /api/background-images/[id]/file. */
export async function downloadBackgroundImage(id: string): Promise<{ blob: Blob; mimeType: string }> {
  const record = await getBackgroundImage(id);
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.storage
    .from(SURFACE_BACKGROUNDS_BUCKET)
    .download(record.storagePath);

  if (error || !data) {
    throw new Error(`Không tải được ảnh từ Storage: ${error?.message ?? "unknown"}`);
  }

  return { blob: data, mimeType: record.mimeType };
}
