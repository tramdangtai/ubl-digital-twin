import { create } from "zustand";

/**
 * Draft cho luồng "Gán hàng loạt": user chọn 1 Product rồi bấm lần lượt các
 * Display Position trên canvas.
 *
 * Nguyên tắc #1 (Draft vs Persisted): mỗi lần bấm CHỈ thêm vào draft này, không
 * gọi API. Toàn bộ chỉ ghi DB khi user bấm Lưu → 1 request → 1 transaction.
 * Cùng pattern với bulk-generate-draft.ts đã có.
 *
 * KHÔNG dùng `persist` — Draft không được sống qua reload (giống
 * fixture-draft.ts / display-position-draft.ts).
 */

/** Snapshot Product đang cầm — UI state, không phải Business Data. */
export interface StampProductRef {
  productId: string;
  itemCode: string;
  description: string;
  imageUrl: string | null;
}

export interface PendingAssignment {
  productId: string;
  facingQty: number;
  /** Snapshot để vẽ nhãn ô pending mà không phải fetch lại Product. */
  itemCode: string;
  description: string;
  imageUrl: string | null;
}

/** Lý do một cú bấm bị từ chối — hiện flash đỏ trên ô rồi tự tắt. */
export type StampRejectReason =
  | "ACTIVE_ASSIGNMENT_EXISTS"
  | "POSITION_NOT_ACTIVE"
  | "NO_PRODUCT"
  | "LIMIT_REACHED";

export const STAMP_REJECT_MESSAGES: Record<StampRejectReason, string> = {
  ACTIVE_ASSIGNMENT_EXISTS: "Ô này đã có sản phẩm — gỡ sản phẩm cũ trước khi gán mới.",
  POSITION_NOT_ACTIVE: "Display Position này đã Archived.",
  NO_PRODUCT: "Chọn một sản phẩm trước khi bấm vào ô.",
  LIMIT_REACHED: `Đã đạt giới hạn ô mỗi lần lưu — bấm Lưu rồi gán tiếp.`,
};

/** Trần mỗi lần Lưu, khớp MAX_BULK_ASSIGN_ITEMS ở validation/product-assignment.ts. */
export const MAX_PENDING_ASSIGNMENTS = 200;

/**
 * MIME type riêng cho thao tác kéo-thả Product vào ô trên canvas.
 *
 * Dùng type riêng (không phải "text/plain") để canvas chỉ nhận đúng thứ app
 * này kéo ra — kéo một đoạn text bất kỳ từ nơi khác vào sẽ không bị hiểu nhầm
 * thành lệnh gán sản phẩm.
 */
export const PRODUCT_DND_MIME = "application/x-ubl-product";

interface BulkAssignDraftState {
  /** null = không có phiên nào. Phiên luôn gắn với đúng 1 Surface. */
  surfaceId: string | null;
  currentProduct: StampProductRef | null;
  currentFacingQty: number;
  /** positionId -> pending. Keyed theo position nên 1 phiên gán được nhiều Product. */
  pending: Record<string, PendingAssignment>;
  rejected: Record<string, StampRejectReason>;
  /** positionId -> message, set sau khi Lưu thất bại (lỗi per-item từ server). */
  itemErrors: Record<string, string>;

  startSession: (surfaceId: string, product: StampProductRef | null) => void;
  setCurrentProduct: (product: StampProductRef) => void;
  setCurrentFacingQty: (qty: number) => void;
  /** Toggle: đang pending cùng product → gỡ; khác product → thay; chưa có → thêm. */
  stampPosition: (positionId: string) => void;
  removePending: (positionId: string) => void;
  applyFacingQtyToAllPending: () => void;
  markRejected: (positionId: string, reason: StampRejectReason) => void;
  clearRejected: (positionId: string) => void;
  setItemErrors: (errors: Record<string, string>) => void;
  /** Sau khi Lưu thành công — giữ phiên và product để gán tiếp. */
  clearPending: () => void;
  endSession: () => void;
}

export const useBulkAssignDraftStore = create<BulkAssignDraftState>((set) => ({
  surfaceId: null,
  currentProduct: null,
  currentFacingQty: 1,
  pending: {},
  rejected: {},
  itemErrors: {},

  startSession: (surfaceId, product) =>
    set({
      surfaceId,
      currentProduct: product,
      currentFacingQty: 1,
      pending: {},
      rejected: {},
      itemErrors: {},
    }),

  setCurrentProduct: (product) => set({ currentProduct: product }),

  setCurrentFacingQty: (qty) => set({ currentFacingQty: qty }),

  stampPosition: (positionId) =>
    set((s) => {
      if (!s.currentProduct) return s;
      const existing = s.pending[positionId];
      const next = { ...s.pending };

      // Bấm lại ô đang pending với CÙNG product = gỡ ra. Đây chính là undo.
      if (existing && existing.productId === s.currentProduct.productId) {
        delete next[positionId];
      } else {
        // Chưa có, hoặc đang pending product khác → ghi đè bằng product hiện tại.
        next[positionId] = {
          productId: s.currentProduct.productId,
          facingQty: s.currentFacingQty,
          itemCode: s.currentProduct.itemCode,
          description: s.currentProduct.description,
          imageUrl: s.currentProduct.imageUrl,
        };
      }

      // Bấm lại ô đang báo lỗi thì xoá lỗi cũ đi.
      const nextErrors = { ...s.itemErrors };
      delete nextErrors[positionId];
      return { pending: next, itemErrors: nextErrors };
    }),

  removePending: (positionId) =>
    set((s) => {
      const next = { ...s.pending };
      delete next[positionId];
      const nextErrors = { ...s.itemErrors };
      delete nextErrors[positionId];
      return { pending: next, itemErrors: nextErrors };
    }),

  // Cố ý là hành động riêng, không tự động: đổi facing ở thanh bar KHÔNG sửa
  // ngược các ô đã dán, tránh kiểu "tôi có bảo sửa đâu".
  applyFacingQtyToAllPending: () =>
    set((s) => {
      const next: Record<string, PendingAssignment> = {};
      for (const [id, p] of Object.entries(s.pending)) {
        next[id] = { ...p, facingQty: s.currentFacingQty };
      }
      return { pending: next };
    }),

  markRejected: (positionId, reason) =>
    set((s) => ({ rejected: { ...s.rejected, [positionId]: reason } })),

  clearRejected: (positionId) =>
    set((s) => {
      const next = { ...s.rejected };
      delete next[positionId];
      return { rejected: next };
    }),

  setItemErrors: (itemErrors) => set({ itemErrors }),

  clearPending: () => set({ pending: {}, rejected: {}, itemErrors: {} }),

  endSession: () =>
    set({
      surfaceId: null,
      currentProduct: null,
      currentFacingQty: 1,
      pending: {},
      rejected: {},
      itemErrors: {},
    }),
}));

/** Đếm số ô đang chờ — dùng làm selector để không subscribe cả object. */
export const selectPendingCount = (s: BulkAssignDraftState) => Object.keys(s.pending).length;
