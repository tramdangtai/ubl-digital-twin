import { create } from "zustand";

/**
 * Draft cho form Bulk-generate Display Position — chỉ phục vụ Workspace vẽ
 * preview lưới trước khi Save (Part 04 §7.2 "Preview in Workspace"), không
 * phải Business Data, không gọi API cho tới khi user xác nhận Save.
 */
export interface BulkGenerateDraft {
  rows: number;
  columns: number;
  startX: number;
  startY: number;
  cellWidthMm: number;
  cellHeightMm: number;
  gapXMm: number;
  gapYMm: number;
}

interface BulkGenerateDraftState {
  draft: BulkGenerateDraft | null;
  setDraft: (draft: BulkGenerateDraft) => void;
  clearDraft: () => void;
}

export const useBulkGenerateDraftStore = create<BulkGenerateDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
