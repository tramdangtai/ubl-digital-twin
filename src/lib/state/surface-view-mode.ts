import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Giai đoạn 8 C1: trạng thái nút chuyển "Chữ / Ảnh" ở Surface View.
 *
 * Quyết định D1: nút ở cấp Surface (áp cho toàn bộ ô trong Surface đang mở).
 * Quyết định D2: lưu localStorage — View State, không phải Business Data (Part 05 §9).
 * Pattern: copy đúng cách từ panel-layout.ts.
 */

export type SurfaceCellMode = "text" | "image";

interface SurfaceViewModeState {
  cellMode: SurfaceCellMode;
  setCellMode: (m: SurfaceCellMode) => void;
  toggleCellMode: () => void;
}

export const useSurfaceViewModeStore = create<SurfaceViewModeState>()(
  persist(
    (set) => ({
      cellMode: "text",
      setCellMode: (m) => set({ cellMode: m }),
      toggleCellMode: () =>
        set((s) => ({ cellMode: s.cellMode === "text" ? "image" : "text" })),
    }),
    { name: "ubl-surface-view-mode" }
  )
);
