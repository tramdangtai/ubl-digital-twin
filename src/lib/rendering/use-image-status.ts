"use client";

import { useEffect, useState } from "react";

export type ImageStatus = "none" | "loading" | "ok" | "error";

/**
 * Cache module-level: sống theo vòng đời tab. Tránh tải lại / thử lại URL đã biết
 * kết quả (kể cả URL bị hỏng — không retry vô ích).
 */
const imageCache = new Map<string, "ok" | "error">();

/**
 * Hook trạng thái tải ảnh dùng chung cho ProductThumb và SVG canvas.
 * - "none"    : url rỗng/null, không cần render ảnh gì cả.
 * - "loading" : đang tải.
 * - "ok"      : ảnh tải thành công, an toàn để hiển thị.
 * - "error"   : ảnh hỏng / URL không đúng / CORS / mixed-content — hiển thị placeholder.
 *
 * Note: URL http:// trên production HTTPS bị trình duyệt chặn mixed-content →
 * rơi vào "error". Đây là hành vi đúng, không phải bug — placeholder sẽ hiện.
 */
export function useImageStatus(url: string | null | undefined): ImageStatus {
  // Nếu url rỗng/null trả "none" ngay — không cần effect.
  const trimmed = url?.trim() || "";
  const cached = trimmed ? imageCache.get(trimmed) : undefined;

  const [status, setStatus] = useState<ImageStatus>(() => {
    if (!trimmed) return "none";
    if (cached) return cached;
    return "loading";
  });

  useEffect(() => {
    if (!trimmed) {
      setStatus("none");
      return;
    }

    const hit = imageCache.get(trimmed);
    if (hit) {
      setStatus(hit);
      return;
    }

    setStatus("loading");
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      imageCache.set(trimmed, "ok");
      if (!cancelled) setStatus("ok");
    };
    img.onerror = () => {
      imageCache.set(trimmed, "error");
      if (!cancelled) setStatus("error");
    };
    img.src = trimmed;

    return () => {
      cancelled = true;
    };
  }, [trimmed]);

  return status;
}
