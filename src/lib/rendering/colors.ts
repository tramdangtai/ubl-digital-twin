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
