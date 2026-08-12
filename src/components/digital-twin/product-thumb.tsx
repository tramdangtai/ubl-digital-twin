"use client";

import { ImageOff } from "lucide-react";

import { useImageStatus } from "@/lib/rendering/use-image-status";

/**
 * Thumbnail ảnh sản phẩm dùng chung cho Product Library, panels, canvas.
 *
 * Ba trạng thái:
 * - "ok"      : <img> vừa khung, object-contain, không méo.
 * - "loading" : khung xám pulse.
 * - "none" / "error" : khung xám + icon ImageOff (Lucide).
 *
 * Khung luôn chiếm đúng size×size ở mọi trạng thái — không để layout nhảy.
 *
 * Note: URL http:// trên production HTTPS bị mixed-content → "error" → placeholder.
 * Đó là hành vi đúng.
 */
export function ProductThumb({
  url,
  alt,
  size = 32,
  className = "",
}: {
  url: string | null | undefined;
  alt: string;
  size?: number;
  className?: string;
}) {
  const status = useImageStatus(url);

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
  };

  if (status === "ok" && url) {
    return (
      <div
        style={baseStyle}
        className={`shrink-0 overflow-hidden rounded border border-border bg-white ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Quyết định D8: dùng <img> thuần, không next/image */}
        <img
          src={url}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div
        style={baseStyle}
        className={`shrink-0 animate-pulse rounded border border-border bg-muted-bg ${className}`}
      />
    );
  }

  // "none" hoặc "error"
  const iconSize = Math.round(size * 0.55);
  const title = status === "error" ? "Hình ảnh không tải được" : "Không có hình ảnh";
  return (
    <div
      style={baseStyle}
      title={title}
      className={`shrink-0 flex items-center justify-center rounded border border-border bg-muted-bg ${className}`}
    >
      <ImageOff size={iconSize} className="text-muted" />
    </div>
  );
}
