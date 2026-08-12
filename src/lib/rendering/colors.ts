/**
 * Bảng màu dùng chung giữa Workspace canvas (màn hình) và Surface PNG export.
 * Rút ra đây để hai nơi không lệch màu khi ai sửa một bên.
 *
 * Display Position có Active Assignment → màu xanh lá.
 * Display Position trống (chưa gán) → màu tím nhạt.
 */

export const OCCUPIED_FILL = "#dcfce7";
export const OCCUPIED_STROKE = "#16a34a";
export const OCCUPIED_TEXT = "#14532d";

export const EMPTY_FILL = "#eef2ff";
export const EMPTY_STROKE = "#6366f1";
export const EMPTY_TEXT = "#312e81";

/**
 * Trạng thái CHỈ có trên màn hình, không bao giờ đưa vào PNG export — ảnh xuất
 * ra chỉ được thể hiện dữ liệu đã persist (nguyên tắc #8).
 *
 * Pending = đã bấm trong phiên gán hàng loạt nhưng chưa Lưu. Dùng cùng tông cam
 * với preview Bulk Generate để "cam = Draft chưa lưu" nhất quán toàn app.
 */
export const PENDING_FILL = "#fff7ed";
export const PENDING_STROKE = "#e85d04";
export const PENDING_TEXT = "#7c2d12";

/** Bấm bị từ chối, hoặc item lỗi sau khi Lưu thất bại. */
export const REJECTED_FILL = "#fee2e2";
export const REJECTED_STROKE = "#dc2626";
export const REJECTED_TEXT = "#7f1d1d";
