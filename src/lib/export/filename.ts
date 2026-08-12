import type { SurfaceExportContext } from "./types";

/**
 * Quyết định D5: tên file = `RET-001_ST-G2_FX-001_Front_2026-08-12`.
 * - retailer_code/store_code/fixture_code unique toàn hệ thống (CLAUDE.md #4).
 * - Slugify: bỏ dấu tiếng Việt, thay ký tự ngoài [A-Za-z0-9] bằng "-",
 *   gộp "-" liên tiếp, trim đầu/cuối, cắt 40 ký tự.
 */
export function slugifySegment(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")        // bỏ combining diacritics
    .replace(/[^A-Za-z0-9]+/g, "-")         // ký tự lạ → "-"
    .replace(/-+/g, "-")                    // gộp "-" liên tiếp
    .replace(/^-|-$/g, "")                  // trim đầu/cuối
    .slice(0, 40);
}

export function buildSurfaceExportBaseName(ctx: SurfaceExportContext): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const surfaceLabel = ctx.surface.surfaceName || ctx.surface.orientation;
  return [
    slugifySegment(ctx.retailer.retailerCode),
    slugifySegment(ctx.store.storeCode),
    slugifySegment(ctx.fixture.fixtureCode),
    slugifySegment(surfaceLabel),
    today,
  ].join("_");
}
