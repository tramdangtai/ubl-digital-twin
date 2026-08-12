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

/**
 * Độ đậm nền khung Display Position khi Surface có ảnh nền.
 *
 * Trước đây khung tô màu đặc nên đè kín ảnh nền (Giai đoạn 9) — ảnh nền gần như
 * vô dụng. Ba mức này cho user tự cân đối giữa "thấy rõ ô" và "thấy rõ kệ thật".
 * Cũng là View State → localStorage, không thêm cột DB (đúng quyết định D2).
 */
export type CellOpacityLevel = "solid" | "medium" | "light";

export const CELL_FILL_OPACITY: Record<CellOpacityLevel, number> = {
  solid: 1,
  medium: 0.35,
  light: 0.12,
};

export const CELL_OPACITY_LABELS: Record<CellOpacityLevel, string> = {
  solid: "Đậm",
  medium: "Vừa",
  light: "Mờ",
};

interface SurfaceViewModeState {
  cellMode: SurfaceCellMode;
  setCellMode: (m: SurfaceCellMode) => void;
  toggleCellMode: () => void;
  /** Chỉ có tác dụng khi Surface đang mở có ảnh nền. */
  cellOpacity: CellOpacityLevel;
  setCellOpacity: (o: CellOpacityLevel) => void;
}

export const useSurfaceViewModeStore = create<SurfaceViewModeState>()(
  persist(
    (set) => ({
      cellMode: "text",
      setCellMode: (m) => set({ cellMode: m }),
      toggleCellMode: () =>
        set((s) => ({ cellMode: s.cellMode === "text" ? "image" : "text" })),
      // "medium" làm mặc định: bật ảnh nền lên là thấy ngay tác dụng, nhưng ô
      // vẫn đọc được. Surface không có ảnh nền thì giá trị này bị bỏ qua.
      cellOpacity: "medium",
      setCellOpacity: (o) => set({ cellOpacity: o }),
    }),
    { name: "ubl-surface-view-mode" }
  )
);
