import type { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth/guard";
import { apiError } from "@/lib/api/response";
import { downloadBackgroundImage } from "@/lib/services/background-image.service";

/**
 * GET /api/background-images/[id]/file — proxy trả bytes ảnh từ Storage.
 *
 * Dùng để:
 * 1. Hiển thị ảnh nền trong SVG Surface View (src="/api/background-images/[id]/file").
 * 2. Cung cấp bytes cho fetch() → data: URI trong PNG export (same-origin, không cần CORS header).
 *
 * Cache-Control: private (đã đăng nhập mới thấy), immutable (ảnh không đổi nội dung — chỉ có
 * thể Archive rồi upload cái mới). max-age=3600 giảm số request, immutable tắt revalidation.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const { blob, mimeType } = await downloadBackgroundImage(id);

    const arrayBuffer = await blob.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600, immutable",
        "Content-Length": String(arrayBuffer.byteLength),
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
