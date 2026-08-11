/**
 * Rendering Engine — chuyển đổi tọa độ vật lý (mm) sang tọa độ màn hình (px).
 *
 * Theo Part 07: pure function, không chứa Business Logic, không ghi Database,
 * chỉ transform Business Data → Visual Representation.
 *
 * Quyết định rendering (không có trong Foundation gốc, ghi rõ ở đây):
 * Workspace cấp Store là floor plan NHÌN TỪ TRÊN XUỐNG (top-down), giống mọi
 * phần mềm CAD/planogram. Vì vậy bounding box của Fixture trên canvas này là
 * width_mm × depth_mm (chiều ngang × chiều sâu khi đặt trên sàn), KHÔNG phải
 * width_mm × height_mm (height là chiều cao đứng, không xuất hiện ở view
 * top-down). height_mm chỉ có ý nghĩa khi vào Surface View (Giai đoạn 3).
 *
 * Coordinate system — xem CLAUDE.md quyết định #3:
 * - position_x/position_y = góc trên-trái bounding box TRƯỚC khi xoay.
 * - rotation_degree = xoay thuận chiều kim đồng hồ quanh TÂM bounding box.
 * - Trục Y hướng xuống, khớp quy ước SVG nên không cần lật trục khi render.
 */

export function mmToPx(mm: number, scale: number): number {
  return mm * scale;
}

export function pxToMm(px: number, scale: number): number {
  return px / scale;
}

export interface FixtureTopDownGeometry {
  positionX: number;
  positionY: number;
  widthMm: number;
  depthMm: number;
  rotationDegree: number;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  /** SVG transform string — rotate quanh tâm, thuận chiều kim đồng hồ. */
  transform: string;
}

/** Chuyển geometry vật lý (mm, Store space) sang hình chữ nhật trên màn hình (px). */
export function fixtureScreenRect(
  geometry: FixtureTopDownGeometry,
  scale: number,
  panX: number,
  panY: number
): ScreenRect {
  const x = mmToPx(geometry.positionX, scale) + panX;
  const y = mmToPx(geometry.positionY, scale) + panY;
  const width = mmToPx(geometry.widthMm, scale);
  const height = mmToPx(geometry.depthMm, scale);
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return {
    x,
    y,
    width,
    height,
    centerX,
    centerY,
    transform: `rotate(${geometry.rotationDegree}, ${centerX}, ${centerY})`,
  };
}

/** Đưa góc xoay về khoảng [0, 360) sau khi cộng/trừ trong lúc tương tác. */
export function normalizeDegree(degree: number): number {
  const normalized = degree % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export interface SurfaceLocalGeometry {
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
}

/**
 * Chuyển geometry vật lý trong Surface space (mm, origin = góc trên-trái
 * Surface, y hướng xuống — CLAUDE.md quyết định #3) sang hình chữ nhật trên
 * màn hình. Display Position luôn axis-aligned trong Surface — không có
 * rotation (Part 03 §8), khác Fixture trong Store space.
 */
export function positionScreenRect(
  geometry: SurfaceLocalGeometry,
  scale: number,
  panX: number,
  panY: number
) {
  return {
    x: mmToPx(geometry.x, scale) + panX,
    y: mmToPx(geometry.y, scale) + panY,
    width: mmToPx(geometry.widthMm, scale),
    height: mmToPx(geometry.heightMm, scale),
  };
}
