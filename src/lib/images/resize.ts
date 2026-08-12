/**
 * Giai đoạn 9 — Resize ảnh phía client trước khi upload.
 *
 * Tại sao cần: Vercel serverless function có giới hạn body ~4.5 MB.
 * Ảnh chụp điện thoại hiện đại thường 3-15 MB → phải resize trước khi upload.
 *
 * Thuật toán: nếu cạnh dài > MAX_SIDE_PX → scale down giữ tỉ lệ, xuất JPEG q=0.85.
 * Nếu ảnh đủ nhỏ → trả nguyên File gốc (không re-encode, giữ chất lượng tối đa).
 *
 * Sử dụng `createImageBitmap` + Canvas API — không cần thêm thư viện.
 */

const MAX_SIDE_PX = 2560;

export interface ResizeResult {
  file: File;
  widthPx: number;
  heightPx: number;
}

export async function resizeImageForUpload(original: File): Promise<ResizeResult> {
  const bitmap = await createImageBitmap(original);
  const { width, height } = bitmap;

  const longestSide = Math.max(width, height);

  // Ảnh nhỏ hơn giới hạn → không cần resize.
  if (longestSide <= MAX_SIDE_PX) {
    bitmap.close();
    return { file: original, widthPx: width, heightPx: height };
  }

  // Scale down giữ tỉ lệ.
  const ratio = MAX_SIDE_PX / longestSide;
  const targetW = Math.round(width * ratio);
  const targetH = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas 2D context không khả dụng.");
  }

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  return await new Promise<ResizeResult>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("canvas.toBlob trả null.")); return; }
        const resized = new File([blob], original.name.replace(/\.[^.]+$/, ".jpg"), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        resolve({ file: resized, widthPx: targetW, heightPx: targetH });
      },
      "image/jpeg",
      0.85
    );
  });
}
