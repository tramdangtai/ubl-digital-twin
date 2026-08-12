import { positionScreenRect } from "@/lib/rendering/coordinates";
import {
  EMPTY_FILL,
  EMPTY_STROKE,
  EMPTY_TEXT,
  OCCUPIED_FILL,
  OCCUPIED_STROKE,
  OCCUPIED_TEXT,
} from "@/lib/rendering/colors";
import type { SurfaceCellMode } from "@/lib/state/surface-view-mode";
import type { SurfaceExportContext } from "./types";

/**
 * Quyết định D3: luôn render trọn Surface ở scale riêng (~2x), bỏ qua zoom/pan.
 * Quy trình: B1 chuẩn bị ảnh data:URI → B2 dựng SVG string → B3 SVG→canvas → B4 canvas→PNG.
 */

const MAX_PX = 1600;
const PADDING = 32;
const HEADER_H = 44; // dải tiêu đề

/** Escape ký tự XML đặc biệt trong giá trị text. */
function escXml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * B1: chuyển ảnh từ URL → data:URI thông qua fetch + FileReader.
 * Dùng Promise.allSettled để 1 ảnh fail không chặn cả export.
 * Ảnh fail → ô đó fallback về chữ.
 */
async function fetchDataUris(
  urls: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (urls.length === 0) return result;

  const uniqueUrls = [...new Set(urls)];

  async function fetchOne(url: string): Promise<{ url: string; dataUri: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { mode: "cors", signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url, dataUri: reader.result as string });
        reader.onerror = () => reject(new Error("FileReader error"));
        reader.readAsDataURL(blob);
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const results = await Promise.allSettled(uniqueUrls.map(fetchOne));
  for (const r of results) {
    if (r.status === "fulfilled") {
      result.set(r.value.url, r.value.dataUri);
    }
    // Ảnh fail → bỏ qua, ô sẽ fallback về chữ.
  }
  return result;
}

/**
 * B2: dựng chuỗi SVG — pure function, tái dùng positionScreenRect từ Rendering Engine.
 */
function buildSurfaceSvgString(
  ctx: SurfaceExportContext,
  opts: {
    dataUris: Map<string, string>;
    cellMode: SurfaceCellMode;
    scale: number;
    padding: number;
    headerH: number;
  }
): { svg: string; totalWidth: number; totalHeight: number } {
  const { retailer, store, fixture, surface, positions, assignmentByPositionId } = ctx;
  const { dataUris, cellMode, scale, padding, headerH } = opts;

  const surfaceW = Math.round(surface.widthMm * scale);
  const surfaceH = Math.round(surface.heightMm * scale);
  const totalWidth = surfaceW + padding * 2;
  const totalHeight = surfaceH + headerH + padding * 2;

  const panX = padding;
  const panY = headerH + padding;

  const exportedAt = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const titleText = `${escXml(retailer.retailerName)} — ${escXml(store.storeName)} — ${escXml(fixture.fixtureName)} — ${escXml(surface.surfaceName || surface.orientation)}`;
  const subtitleText = `${surface.widthMm} × ${surface.heightMm} mm | Xuất: ${exportedAt}`;

  // Sắp xếp theo y rồi x để render theo thứ tự tự nhiên.
  const sorted = [...positions].sort((a, b) => a.y - b.y || a.x - b.x);

  const positionShapes = sorted.map((pos) => {
    const rect = positionScreenRect(
      { x: pos.x, y: pos.y, widthMm: pos.widthMm, heightMm: pos.heightMm },
      scale,
      panX,
      panY
    );
    const asgn = assignmentByPositionId.get(pos.positionId);
    const prod = asgn?.product;

    const fill = asgn ? OCCUPIED_FILL : EMPTY_FILL;
    const stroke = asgn ? OCCUPIED_STROKE : EMPTY_STROKE;
    const textFill = asgn ? OCCUPIED_TEXT : EMPTY_TEXT;

    const baseShape = `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${fill}" stroke="${stroke}" stroke-width="1.25" rx="2"/>`;

    let content = "";

    if (cellMode === "image" && prod?.imageUrl) {
      const dataUri = dataUris.get(prod.imageUrl);
      if (dataUri) {
        // Hiện ảnh + dải item_code ở đáy.
        content = `
          <image href="${dataUri}" x="${rect.x + 2}" y="${rect.y + 2}" width="${rect.width - 4}" height="${rect.height - 4}" preserveAspectRatio="xMidYMid meet"/>
          ${rect.height > 40 ? `
          <rect x="${rect.x}" y="${rect.y + rect.height - 18}" width="${rect.width}" height="18" fill="rgba(255,255,255,0.85)"/>
          <text x="${rect.x + 4}" y="${rect.y + rect.height - 6}" font-size="8" fill="${OCCUPIED_TEXT}">${escXml(prod.itemCode)}</text>
          ` : ""}
        `;
      } else {
        // Ảnh fetch thất bại — fallback về chữ.
        content = buildTextContent(rect, pos, asgn, textFill);
      }
    } else {
      content = buildTextContent(rect, pos, asgn, textFill);
    }

    return baseShape + content;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
    width="${totalWidth}" height="${totalHeight}"
    font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
  <!-- Nền trắng đặc — PNG không nền sẽ ra nền đen khi dán vào PowerPoint -->
  <rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff"/>

  <!-- Dải tiêu đề -->
  <rect width="${totalWidth}" height="${headerH}" fill="#f8fafc"/>
  <rect width="${totalWidth}" height="1" y="${headerH}" fill="#e2e8f0"/>
  <text x="${padding}" y="18" font-size="13" font-weight="600" fill="#1e3a5f">${titleText}</text>
  <text x="${padding}" y="34" font-size="10" fill="#64748b">${subtitleText}</text>

  <!-- Viền Surface -->
  <rect x="${panX}" y="${panY}" width="${surfaceW}" height="${surfaceH}" fill="#ffffff" stroke="#1a365d" stroke-width="2"/>

  <!-- Display Positions -->
  ${positionShapes.join("\n  ")}
</svg>`;

  return { svg, totalWidth, totalHeight };
}

function buildTextContent(
  rect: { x: number; y: number; width: number; height: number },
  pos: { displayType: string },
  asgn: { product: { description: string; itemCode: string } } | undefined,
  textFill: string
): string {
  if (!asgn) {
    if (rect.width <= 30) return "";
    return `<text x="${rect.x + 4}" y="${rect.y + 12}" font-size="9" fill="${textFill}">${escXml(pos.displayType)}</text>`;
  }
  let text = "";
  if (rect.width > 30) {
    text += `<text x="${rect.x + 4}" y="${rect.y + 12}" font-size="9" fill="${textFill}">${escXml(asgn.product.description)}</text>`;
  }
  if (rect.width > 30 && rect.height > 26) {
    text += `<text x="${rect.x + 4}" y="${rect.y + 23}" font-size="8" fill="#166534">${escXml(asgn.product.itemCode)}</text>`;
  }
  return text;
}

/**
 * B3 + B4: SVG string → canvas → PNG Blob.
 */
async function svgToCanvas(svgString: string, width: number, height: number): Promise<HTMLCanvasElement> {
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas context không khả dụng.")); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = () => reject(new Error("Không thể nạp SVG vào <img>."));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportSurfacePng(
  ctx: SurfaceExportContext,
  opts: { cellMode: SurfaceCellMode }
): Promise<Blob> {
  const { cellMode } = opts;

  // Tính scale: MAX_PX / cạnh dài, nhân 2 cho nét.
  const longestSide = Math.max(ctx.surface.widthMm, ctx.surface.heightMm);
  const scale = Math.min(MAX_PX / longestSide, MAX_PX / longestSide) * 2;

  // B1: chuẩn bị data URI (chỉ khi cellMode = "image").
  let dataUris = new Map<string, string>();
  if (cellMode === "image") {
    const urls: string[] = [];
    for (const pos of ctx.positions) {
      const asgn = ctx.assignmentByPositionId.get(pos.positionId);
      if (asgn?.product.imageUrl) urls.push(asgn.product.imageUrl);
    }
    dataUris = await fetchDataUris(urls);
  }

  // B2: dựng SVG.
  const { svg, totalWidth, totalHeight } = buildSurfaceSvgString(ctx, {
    dataUris,
    cellMode,
    scale,
    padding: PADDING,
    headerH: HEADER_H,
  });

  // B3: SVG → canvas.
  const canvas = await svgToCanvas(svg, totalWidth, totalHeight);

  // B4: canvas → PNG Blob.
  return await new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("canvas.toBlob trả null.")); return; }
        resolve(blob);
      }, "image/png");
    } catch (e) {
      // Canvas bị tainted (ảnh không qua data URI) → hướng dẫn rõ.
      if (e instanceof DOMException && e.name === "SecurityError") {
        reject(new Error(
          "Không xuất được ảnh vì một hình sản phẩm chặn truy cập (CORS). Thử lại ở chế độ xem Chữ."
        ));
      } else {
        reject(e);
      }
    }
  });
}
