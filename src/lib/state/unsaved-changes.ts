import { useEffect } from "react";
import { create } from "zustand";

import { useBulkAssignDraftStore } from "./bulk-assign-draft";
import { useDisplayPositionDraftStore } from "./display-position-draft";
import { useFixtureDraftStore } from "./fixture-draft";

/**
 * Navigation guard cho Draft dạng local-state (Retailer/Store/Surface/Product
 * Detail Panel — các entity này chưa có Zustand draft store riêng như
 * Fixture/Display Position, nên chuyển selection sẽ unmount component và mất
 * Draft im lặng nếu không chặn lại). Panel đang edit tự đồng bộ `isDirty` vào
 * đây; các action đổi selection trong `selection.ts` gọi
 * `confirmDiscardUnsavedChanges()` trước khi điều hướng — đúng Part 05 §29
 * (không tự động discard Draft chưa lưu).
 *
 * Fixture/Display Position không cần cờ này vì Draft của chúng đã nằm trong
 * Zustand store riêng (`fixture-draft.ts`/`display-position-draft.ts`), sống
 * độc lập với selection nên không bị mất khi điều hướng.
 */
interface UnsavedChangesState {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
}

export const useUnsavedChangesStore = create<UnsavedChangesState>((set) => ({
  isDirty: false,
  setDirty: (dirty) => set({ isDirty: dirty }),
}));

/** Gọi trong action điều hướng trước khi đổi selection. false = huỷ điều hướng. */
export function confirmDiscardUnsavedChanges(): boolean {
  const { isDirty, setDirty } = useUnsavedChangesStore.getState();
  if (!isDirty) return true;
  const confirmed = window.confirm(
    "Bạn có thay đổi chưa lưu. Rời khỏi đây sẽ mất các thay đổi này. Tiếp tục?"
  );
  if (confirmed) setDirty(false);
  return confirmed;
}

/**
 * Guard riêng cho Draft gán hàng loạt.
 *
 * KHÔNG gộp vào cờ `isDirty` ở trên: cờ đó dành cho Draft local-state chết theo
 * unmount, còn Draft gán hàng loạt nằm trong Zustand store nên sống qua mọi lần
 * đổi selection — gộp vào sẽ hỏi lại mỗi lần user bấm 1 ô trong cùng Surface.
 *
 * Chỉ hỏi khi THẬT SỰ rời khỏi Surface đang dán. Đổi tab Explorer hay chọn
 * Product khác đều không gọi hàm này — user phải qua lại Product Library được.
 *
 * @param nextSurfaceId Surface sắp chuyển tới (null = rời hẳn Surface View).
 * @returns false = huỷ điều hướng.
 */
export function confirmLeaveBulkAssign(nextSurfaceId: string | null): boolean {
  const state = useBulkAssignDraftStore.getState();
  const count = Object.keys(state.pending).length;

  if (state.surfaceId === null) return true;
  if (nextSurfaceId === state.surfaceId) return true;

  if (count === 0) {
    state.endSession();
    return true;
  }

  const confirmed = window.confirm(
    `Bạn còn ${count} vị trí chưa lưu trong phiên gán hàng loạt. Rời khỏi Surface này sẽ mất chúng. Tiếp tục?`
  );
  if (confirmed) state.endSession();
  return confirmed;
}

/**
 * Cảnh báo khi đóng tab/refresh trong lúc còn Draft chưa lưu — gộp cả 3 nguồn
 * Draft hiện có: local-state Draft (Retailer/Store/Surface/Product, qua cờ
 * `isDirty` ở trên) và Zustand draft store của Fixture/Display Position (biết
 * đang edit khi `editingFixtureId`/`editingPositionId` khác null).
 */
export function useBeforeUnloadGuard() {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const hasUnsaved =
        useUnsavedChangesStore.getState().isDirty ||
        useFixtureDraftStore.getState().editingFixtureId !== null ||
        useDisplayPositionDraftStore.getState().editingPositionId !== null ||
        Object.keys(useBulkAssignDraftStore.getState().pending).length > 0;
      if (!hasUnsaved) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}
