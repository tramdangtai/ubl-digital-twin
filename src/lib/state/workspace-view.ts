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
  panBy: (deltaX: number, deltaY: number) => void;
  resetView: () => void;
}

export const useWorkspaceViewStore = create<WorkspaceViewState>((set) => ({
  scale: DEFAULT_SCALE,
  panX: 40,
  panY: 40,

  zoomBy: (factor) => set((s) => ({ scale: clampScale(s.scale * factor) })),
  zoomTo: (scale) => set({ scale: clampScale(scale) }),
  panBy: (deltaX, deltaY) => set((s) => ({ panX: s.panX + deltaX, panY: s.panY + deltaY })),
  resetView: () => set({ scale: DEFAULT_SCALE, panX: 40, panY: 40 }),
}));
