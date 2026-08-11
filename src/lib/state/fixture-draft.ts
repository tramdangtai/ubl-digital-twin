import { create } from "zustand";

import type { FixtureEditableFields } from "@/lib/types/entities";

/**
 * Draft State cho Fixture đang chỉnh sửa — Part 05 §5-6, Part 07 §4/§19.
 *
 * Chỉ 1 Fixture được Edit Mode tại 1 thời điểm (đúng nguyên tắc "mỗi Object
 * Type có tối đa 1 selected/editing ID" — Part 05 §8). Rendering Engine ưu
 * tiên render `draft` cho Fixture đang editingFixtureId; các Fixture khác
 * luôn render từ Persisted Data.
 */
interface FixtureDraftState {
  editingFixtureId: string | null;
  draft: FixtureEditableFields | null;

  startEdit: (fixtureId: string, initial: FixtureEditableFields) => void;
  updateDraft: (patch: Partial<FixtureEditableFields>) => void;
  cancelEdit: () => void;
  clearAfterSave: () => void;
}

export const useFixtureDraftStore = create<FixtureDraftState>((set) => ({
  editingFixtureId: null,
  draft: null,

  startEdit: (fixtureId, initial) => set({ editingFixtureId: fixtureId, draft: initial }),
  updateDraft: (patch) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : s)),
  cancelEdit: () => set({ editingFixtureId: null, draft: null }),
  clearAfterSave: () => set({ editingFixtureId: null, draft: null }),
}));
