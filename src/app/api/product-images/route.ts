import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { apiError } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db/client";
import { product } from "@/lib/db/schema";

/**
 * GET /api/product-images?url=… — proxy ảnh sản phẩm từ host bên ngoài.
 *
 * Vì sao cần: host ảnh của UBL (`file.uncle-bills.com`) không gửi
 * `Access-Control-Allow-Origin`. Thẻ `<img>` vẫn hiện được vì không cần CORS,
 * nên Surface View chế độ "Ảnh" chạy bình thường. Nhưng export PNG **phải đọc
 * được bytes** để chuyển sang `data:` URI (nếu nhúng URL ngoài thì canvas bị
 * tainted và `toBlob()` ném SecurityError) — mà `fetch()` thì bị CORS chặn.
 * Proxy qua chính server mình là same-origin nên hết vướng.
 *
 * Chống lạm dụng làm open proxy: chỉ phục vụ URL **đã tồn tại trong
 * `product.image_url`**. Người ngoài không thể mượn endpoint này để tải nội
 * dung tuỳ ý, và vẫn phải đăng nhập.
 */

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = /^image\/(png|jpeg|jpg|webp|gif|avif)$/i;

export async function GET(request: NextRequest) {
  try {
    await requireUser();

    const raw = request.nextUrl.searchParams.get("url");
    if (!raw) {
      throw new AppError("Thiếu tham số url.", 422, "VALIDATION_FAILED");
    }

    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new AppError("URL ảnh không hợp lệ.", 422, "VALIDATION_FAILED");
    }
    if (parsed.protocol !== "https:") {
      throw new AppError("Chỉ nhận URL https.", 422, "VALIDATION_FAILED");
    }

    // Chỉ cho phép URL thật sự đang được dùng bởi một Product.
    const [row] = await db
      .select({ productId: product.productId })
      .from(product)
      .where(eq(product.imageUrl, raw))
      .limit(1);
    if (!row) {
      throw new AppError(
        "URL này không thuộc Product nào trong hệ thống.",
        403,
        "FORBIDDEN"
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let upstream: Response;
    try {
      upstream = await fetch(raw, { signal: controller.signal, redirect: "follow" });
    } catch {
      throw new AppError("Không tải được ảnh từ nguồn.", 502, "UPSTREAM_ERROR");
    } finally {
      clearTimeout(timer);
    }

    if (!upstream.ok) {
      throw new AppError(
        `Nguồn ảnh trả về ${upstream.status}.`,
        upstream.status === 404 ? 404 : 502,
        upstream.status === 404 ? "NOT_FOUND" : "UPSTREAM_ERROR"
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!ALLOWED_TYPES.test(contentType.split(";")[0].trim())) {
      throw new AppError("Nội dung tải về không phải ảnh.", 502, "UPSTREAM_ERROR");
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      throw new AppError("Ảnh quá lớn.", 502, "UPSTREAM_ERROR");
    }

    return new Response(buf, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buf.byteLength),
        // Ảnh sản phẩm hiếm khi đổi; cache mạnh để export nhiều ô không gọi lại.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
