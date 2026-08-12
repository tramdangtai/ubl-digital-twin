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
export function buildSurfaceSvgString(
  ctx: SurfaceExportContext,
  opts: {
    dataUris: Map<string, string>;
    bgDataUri: string | null;
    cellMode: SurfaceCellMode;
    scale: number;
    padding: number;
    headerH: number;
  }
): { svg: string; totalWidth: number; totalHeight: number } {
  const { retailer, store, fixture, surface, positions, assignmentByPositionId } = ctx;
  const { dataUris, bgDataUri, cellMode, scale, padding, headerH } = opts;

  const surfaceW = Math.round(surface.widthMm * scale);
  const surfaceH = Math.round(surface.heightMm * scale);

  // Header cũng phải tỉ lệ theo scale, nếu không tiêu đề sẽ nhỏ li ti trên
  // canvas vài nghìn px — cùng lý do với FONT_MM ở buildTextContent.
  const titleFont = FONT_MM * 0.85 * scale;
  const subFont = FONT_MM * 0.6 * scale;
  const actualHeaderH = Math.max(headerH, titleFont + subFont + titleFont * 0.9);

  const totalWidth = surfaceW + padding * 2;
  const totalHeight = surfaceH + actualHeaderH + padding * 2;

  const panX = padding;
  const panY = actualHeaderH + padding;

  const exportedAt = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const titleText = `${escXml(retailer.retailerName)} — ${escXml(store.storeName)} — ${escXml(fixture.fixtureName)} — ${escXml(surface.surfaceName || surface.orientation)}`;
  const subtitleText = `${surface.widthMm} × ${surface.heightMm} mm | Xuất: ${exportedAt}`;

  // Sắp xếp theo y rồi x để render theo thứ tự tự nhiên.
  const sorted = [...positions].sort((a, b) => a.y - b.y || a.x - b.x);

  // Mỗi position cần clipPath riêng để chữ không tràn ra phải.
  const clipDefs: string[] = [];
  const positionShapes = sorted.map((pos, idx) => {
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

    // clipPath giới hạn text trong khung position (padding 3px mỗi bên).
    const clipId = `cp-${idx}`;
    clipDefs.push(
      `<clipPath id="${clipId}"><rect x="${rect.x + 3}" y="${rect.y}" width="${rect.width - 6}" height="${rect.height}"/></clipPath>`
    );

    const baseShape = `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${fill}" stroke="${stroke}" stroke-width="1.25" rx="2"/>`;

    let content = "";

    if (cellMode === "image" && prod?.imageUrl) {
      const dataUri = dataUris.get(prod.imageUrl);
      if (dataUri) {
        // Ảnh chiếm phần trên, dải item_code ở đáy. Font cũng tỉ lệ theo scale
        // (cùng lý do FONT_MM ở buildTextContent) nhưng nhỏ hơn vì chỉ là nhãn.
        const labelFont = FONT_MM * 0.75 * scale;
        const labelH = labelFont * 1.5;
        const imgH = rect.height - 4 - (rect.height > labelH * 2 ? labelH : 0);
        content = `
          <image href="${dataUri}" x="${rect.x + 2}" y="${rect.y + 2}" width="${rect.width - 4}" height="${imgH}" preserveAspectRatio="xMidYMid meet"/>
          ${rect.height > labelH * 2 ? `
          <rect x="${rect.x}" y="${rect.y + rect.height - labelH}" width="${rect.width}" height="${labelH}" fill="rgba(255,255,255,0.9)"/>
          <text x="${rect.x + Math.max(4, labelFont * 0.25)}" y="${rect.y + rect.height - labelH * 0.3}" font-size="${labelFont}" font-weight="600" fill="${OCCUPIED_TEXT}" clip-path="url(#${clipId})">${escXml(prod.itemCode)}</text>
          ` : ""}
        `;
      } else {
        // Ảnh fetch thất bại — fallback về chữ.
        content = buildTextContent(rect, pos, asgn, textFill, clipId, scale);
      }
    } else {
      content = buildTextContent(rect, pos, asgn, textFill, clipId, scale);
    }

    return baseShape + content;
  });

  // clipDefs được thu thập ở vòng lặp trên, đặt vào <defs> ở đây.
  const defsBlock = `<defs>${clipDefs.join("")}</defs>`;

  // Ảnh nền — fit theo backgroundFit (contain / cover / stretch).
  const bgPreserve =
    surface.backgroundFit === "cover"
      ? "xMidYMid slice"
      : surface.backgroundFit === "stretch"
      ? "none"
      : "xMidYMid meet";

  const bgSvg = bgDataUri
    ? `<defs>
    <clipPath id="bg-clip">
      <rect x="${panX}" y="${panY}" width="${surfaceW}" height="${surfaceH}"/>
    </clipPath>
  </defs>
  <image href="${bgDataUri}" x="${panX}" y="${panY}" width="${surfaceW}" height="${surfaceH}"
    opacity="${surface.backgroundOpacity}" preserveAspectRatio="${bgPreserve}"
    clip-path="url(#bg-clip)"/>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
    width="${totalWidth}" height="${totalHeight}"
    font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
  ${defsBlock}

  <!-- Nền trắng đặc — PNG không nền sẽ ra nền đen khi dán vào PowerPoint -->
  <rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff"/>

  <!-- Dải tiêu đề -->
  <rect width="${totalWidth}" height="${actualHeaderH}" fill="#f8fafc"/>
  <rect width="${totalWidth}" height="${Math.max(1, scale)}" y="${actualHeaderH}" fill="#e2e8f0"/>
  <text x="${padding}" y="${titleFont * 1.15}" font-size="${titleFont}" font-weight="700" fill="#1e3a5f">${titleText}</text>
  <text x="${padding}" y="${titleFont * 1.15 + subFont * 1.4}" font-size="${subFont}" fill="#64748b">${subtitleText}</text>

  <!-- Viền Surface -->
  <rect x="${panX}" y="${panY}" width="${surfaceW}" height="${surfaceH}" fill="#ffffff" stroke="#1a365d" stroke-width="2"/>

  <!-- Ảnh nền (nếu có) -->
  ${bgSvg}

  <!-- Display Positions -->
  ${positionShapes.join("\n  ")}
</svg>`;

  return { svg, totalWidth, totalHeight };
}

/**
 * Font size cho PNG export.
 *
 * PNG render ở scale riêng (~1.5), lớn hơn nhiều lần scale màn hình
 * (DEFAULT_SCALE = 0.25). Nếu để font cố định 16px thì khi mở ảnh xem vừa màn
 * hình, chữ hiện ra còn nhỏ hơn lúc xem trên web. Vì vậy font phải tỉ lệ theo
 * scale: FONT_MM chọn sao cho ở scale màn hình 0.25 sẽ ra đúng 16px
 * (16 / 0.25 = 64mm) — kích thước Tài đã chốt là dễ đọc.
 */
const FONT_MM = 64;

function buildTextContent(
  rect: { x: number; y: number; width: number; height: number },
  pos: { displayType: string },
  asgn: { product: { description: string; itemCode: string } } | undefined,
  textFill: string,
  clipId: string,
  scale: number
): string {
  if (rect.width <= 20) return "";

  const font = FONT_MM * scale;
  const line = font * 1.35; // khoảng cách dòng
  const padX = Math.max(4, font * 0.25);
  const baseY = rect.y + font + font * 0.15;

  if (!asgn) {
    return `<text x="${rect.x + padX}" y="${baseY}" font-size="${font}" fill="${textFill}" clip-path="url(#${clipId})">${escXml(pos.displayType)}</text>`;
  }

  // item_code trước (bold), description xuống dòng bên dưới. Dòng nào vượt quá
  // đáy ô thì bỏ — clipPath vẫn cắt phần thừa nếu 1 từ dài hơn cả bề ngang ô.
  let text = `<text x="${rect.x + padX}" y="${baseY}" font-size="${font}" font-weight="700" fill="${textFill}" clip-path="url(#${clipId})">${escXml(asgn.product.itemCode)}</text>`;

  const usableW = rect.width - padX * 2;
  const maxLines = Math.floor((rect.height - baseY + rect.y - font * 0.3) / line);
  for (const [i, lineText] of wrapText(asgn.product.description, usableW, font, maxLines).entries()) {
    text += `<text x="${rect.x + padX}" y="${baseY + line * (i + 1)}" font-size="${font}" fill="${textFill}" clip-path="url(#${clipId})">${escXml(lineText)}</text>`;
  }
  return text;
}

/**
 * Ngắt dòng thủ công — SVG <text> không tự wrap. Ước lượng bề rộng ký tự theo
 * font-size (hệ số 0.52 hợp với font sans-serif hệ thống); không cần chính xác
 * tuyệt đối vì clipPath đã chặn phần tràn.
 */
function wrapText(raw: string, maxWidth: number, fontSize: number, maxLines: number): string[] {
  if (maxLines < 1 || !raw) return [];
  const charW = fontSize * 0.52;
  const maxChars = Math.max(1, Math.floor(maxWidth / charW));

  const lines: string[] = [];
  let current = "";
  for (const word of raw.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
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

  // B1a: chuẩn bị data URI cho ảnh sản phẩm (chỉ khi cellMode = "image").
  let dataUris = new Map<string, string>();
  if (cellMode === "image") {
    const urls: string[] = [];
    for (const pos of ctx.positions) {
      const asgn = ctx.assignmentByPositionId.get(pos.positionId);
      if (asgn?.product.imageUrl) urls.push(asgn.product.imageUrl);
    }
    dataUris = await fetchDataUris(urls);
  }

  // B1b: chuẩn bị data URI cho ảnh nền (same-origin proxy, không cần CORS header đặc biệt).
  let bgDataUri: string | null = null;
  if (ctx.surface.backgroundImageId) {
    const bgUrl = `/api/background-images/${ctx.surface.backgroundImageId}/file`;
    const bgMap = await fetchDataUris([bgUrl]);
    bgDataUri = bgMap.get(bgUrl) ?? null;
  }

  // B2: dựng SVG.
  const { svg, totalWidth, totalHeight } = buildSurfaceSvgString(ctx, {
    dataUris,
    bgDataUri,
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
