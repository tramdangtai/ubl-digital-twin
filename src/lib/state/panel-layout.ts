import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Layout của Explorer/Inspector — thuần View State (Part 05 §9), không phải
 * Business Data, nhưng lưu vào localStorage (không phải Database) để UX
 * không reset mỗi lần reload — phù hợp nguyên tắc "View State không
 * persistence vào Business Database trong Phase 1".
 */

export const EXPLORER_MIN = 200;
export const EXPLORER_MAX = 440;
export const EXPLORER_COLLAPSED_WIDTH = 36;

export const INSPECTOR_MIN = 260;
export const INSPECTOR_MAX = 480;
export const INSPECTOR_COLLAPSED_WIDTH = 36;

export const WORKSPACE_MIN_WIDTH = 320;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface PanelLayoutState {
  explorerWidth: number;
  inspectorWidth: number;
  explorerCollapsed: boolean;
  inspectorCollapsed: boolean;

  adjustExplorerWidth: (deltaPx: number) => void;
  adjustInspectorWidth: (deltaPx: number) => void;
  toggleExplorerCollapsed: () => void;
  toggleInspectorCollapsed: () => void;
}

export const usePanelLayoutStore = create<PanelLayoutState>()(
  persist(
    (set) => ({
      explorerWidth: 260,
      inspectorWidth: 320,
      explorerCollapsed: false,
      inspectorCollapsed: false,

      adjustExplorerWidth: (deltaPx) =>
        set((s) => ({ explorerWidth: clamp(s.explorerWidth + deltaPx, EXPLORER_MIN, EXPLORER_MAX) })),
      // Inspector nằm bên phải: kéo handle sang phải phải làm nó HẸP lại.
      adjustInspectorWidth: (deltaPx) =>
        set((s) => ({ inspectorWidth: clamp(s.inspectorWidth - deltaPx, INSPECTOR_MIN, INSPECTOR_MAX) })),
      toggleExplorerCollapsed: () => set((s) => ({ explorerCollapsed: !s.explorerCollapsed })),
      toggleInspectorCollapsed: () => set((s) => ({ inspectorCollapsed: !s.inspectorCollapsed })),
    }),
    { name: "ubl-digital-twin-panel-layout" }
  )
);
