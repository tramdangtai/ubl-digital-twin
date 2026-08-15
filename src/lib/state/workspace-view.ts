import { create } from "zustand";

/**
 * View State của Workspace — Part 05 §9 / Part 07 §9-10.
 * Zoom/Pan chỉ ảnh hưởng hiển thị, KHÔNG được lưu vào Database và KHÔNG
 * được trộn với Fixture position (Business Data).
 */

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 1;
export const DEFAULT_SCALE = 0.25;

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

interface WorkspaceViewState {
  scale: number;
  panX: number;
  panY: number;

  zoomBy: (factor: number) => void;
  zoomTo: (scale: number) => void;
  /**
   * Zoom bám một điểm cố định trên màn hình (thường là con trỏ chuột).
   * Không có cái này thì phóng to sẽ đẩy nội dung trôi khỏi chỗ đang nhìn —
   * user phải kéo lại sau mỗi lần zoom.
   */
  zoomAt: (factor: number, clientX: number, clientY: number) => void;
  panBy: (deltaX: number, deltaY: number) => void;
  /** Canh toàn bộ nội dung (mm) vừa khít khung nhìn (px), có chừa lề. */
  fitTo: (contentWmm: number, contentHmm: number, viewportW: number, viewportH: number) => void;
  resetView: () => void;
}

export const useWorkspaceViewStore = create<WorkspaceViewState>((set) => ({
  scale: DEFAULT_SCALE,
  panX: 40,
  panY: 40,

  zoomBy: (factor) => set((s) => ({ scale: clampScale(s.scale * factor) })),
  zoomTo: (scale) => set({ scale: clampScale(scale) }),

  zoomAt: (factor, clientX, clientY) =>
    set((s) => {
      const next = clampScale(s.scale * factor);
      if (next === s.scale) return s;
      // Giữ nguyên điểm dưới con trỏ: toạ độ mm tại đó phải không đổi trước và
      // sau khi đổi scale → pan bù theo tỉ lệ scale mới/cũ.
      const k = next / s.scale;
      return {
        scale: next,
        panX: clientX - (clientX - s.panX) * k,
        panY: clientY - (clientY - s.panY) * k,
      };
    }),

  panBy: (deltaX, deltaY) => set((s) => ({ panX: s.panX + deltaX, panY: s.panY + deltaY })),

  fitTo: (contentWmm, contentHmm, viewportW, viewportH) =>
    set(() => {
      if (contentWmm <= 0 || contentHmm <= 0 || viewportW <= 0 || viewportH <= 0) {
        return { scale: DEFAULT_SCALE, panX: 40, panY: 40 };
      }
      const PAD = 32;
      const scale = clampScale(
        Math.min((viewportW - PAD * 2) / contentWmm, (viewportH - PAD * 2) / contentHmm)
      );
      // Căn giữa phần còn dư sau khi đã fit.
      return {
        scale,
        panX: (viewportW - contentWmm * scale) / 2,
        panY: (viewportH - contentHmm * scale) / 2,
      };
    }),

  resetView: () => set({ scale: DEFAULT_SCALE, panX: 40, panY: 40 }),
}));
