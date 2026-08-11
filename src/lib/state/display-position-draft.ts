import { create } from "zustand";

import type { DisplayPositionEditableFields } from "@/lib/types/entities";

/**
 * Draft State cho Display Position đang chỉnh sửa — cùng pattern với
 * fixture-draft.ts (Part 05 §5-6). Giai đoạn 3 chưa làm drag-to-move trên
 * canvas cho từng Display Position riêng lẻ (bulk-generate lo phần lớn khối
 * lượng, chỉnh tay từng cái dùng Inspector numeric field) — có thể bổ sung
 * sau nếu thực tế cần.
 */
interface DisplayPositionDraftState {
  editingPositionId: string | null;
  draft: DisplayPositionEditableFields | null;

  startEdit: (positionId: string, initial: DisplayPositionEditableFields) => void;
  updateDraft: (patch: Partial<DisplayPositionEditableFields>) => void;
  cancelEdit: () => void;
  clearAfterSave: () => void;
}

export const useDisplayPositionDraftStore = create<DisplayPositionDraftState>((set) => ({
  editingPositionId: null,
  draft: null,

  startEdit: (positionId, initial) => set({ editingPositionId: positionId, draft: initial }),
  updateDraft: (patch) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : s)),
  cancelEdit: () => set({ editingPositionId: null, draft: null }),
  clearAfterSave: () => set({ editingPositionId: null, draft: null }),
}));
