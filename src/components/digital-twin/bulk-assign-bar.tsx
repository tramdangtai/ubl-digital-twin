"use client";

import { useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { useBulkCreateProductAssignments } from "@/lib/api/hooks/use-product-assignments";
import { useProducts } from "@/lib/api/hooks/use-products";
import {
  MAX_PENDING_ASSIGNMENTS,
  STAMP_REJECT_MESSAGES,
  useBulkAssignDraftStore,
} from "@/lib/state/bulk-assign-draft";
import { useSelectionStore } from "@/lib/state/selection";

import { ProductThumb } from "./product-thumb";

/**
 * Thanh điều khiển cho phiên "Gán hàng loạt".
 *
 * Đặt trong luồng giữa WorkspaceHeader và canvas (không phải overlay nổi) để
 * không che chính những ô user đang nhắm bấm.
 *
 * Điểm cốt lõi: đổi sản phẩm ngay tại đây, KHÔNG set selectedProductId nên
 * Explorer/Inspector không nhảy — user không phải rời Surface View lần nào.
 * Đây là chỗ khử 2 lần đổi tab của luồng gán 1-ô cũ.
 */
export function BulkAssignBar({ surfaceId }: { surfaceId: string }) {
  const {
    currentProduct,
    currentFacingQty,
    pending,
    rejected,
    itemErrors,
    setCurrentProduct,
    setCurrentFacingQty,
    applyFacingQtyToAllPending,
    clearPending,
    setItemErrors,
  } = useBulkAssignDraftStore();
  const { endBulkAssignProduct } = useSelectionStore();

  const [pickerOpen, setPickerOpen] = useState(!currentProduct);
  const [justSaved, setJustSaved] = useState<number | null>(null);
  const { mutate, isPending, error } = useBulkCreateProductAssignments();

  const pendingCount = Object.keys(pending).length;
  const errorCount = Object.keys(itemErrors).length;
  // Thông báo từ chối gần nhất (ô đã có hàng, chưa chọn sản phẩm...).
  const lastReject = Object.values(rejected)[0];

  function handleSave() {
    const items = Object.entries(pending).map(([positionId, p]) => ({
      positionId,
      productId: p.productId,
      facingQty: p.facingQty,
      displayOrder: 0,
    }));
    if (items.length === 0) return;

    setJustSaved(null);
    setItemErrors({});
    mutate(
      { surfaceId, items },
      {
        onSuccess: () => {
          // Chạy SAU khi invalidate đã settle (hook await) — nếu xoá pending
          // sớm hơn, hàng trăm ô sẽ nháy về màu trống 1 frame.
          const n = items.length;
          clearPending();
          setJustSaved(n);
        },
        onError: (err) => {
          if (err instanceof ApiRequestError && err.errors?.length) {
            // field dạng "items.3.positionId" → map chỉ số về đúng positionId.
            const map: Record<string, string> = {};
            for (const fe of err.errors) {
              const idx = Number(fe.field?.split(".")[1]);
              const item = items[idx];
              if (item) map[item.positionId] = fe.message ?? "Không hợp lệ";
            }
            setItemErrors(map);
          }
        },
      }
    );
  }

  function handleCancel() {
    if (pendingCount > 0 && !window.confirm(`Huỷ ${pendingCount} vị trí đang chờ lưu?`)) return;
    endBulkAssignProduct();
  }

  return (
    <div className="shrink-0 border-b border-ubl-primary/30 bg-amber-50/70">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ubl-secondary">
          Gán hàng loạt
        </span>

        {/* Sản phẩm đang cầm */}
        {currentProduct ? (
          <div className="flex min-w-0 items-center gap-2 rounded border border-border bg-card px-2 py-1">
            <ProductThumb url={currentProduct.imageUrl} alt={currentProduct.description} size={24} />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-xs font-medium text-ubl-secondary">
                {currentProduct.itemCode}
              </span>
              <span className="max-w-[180px] truncate text-[11px] text-muted">
                {currentProduct.description}
              </span>
            </div>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="ml-1 rounded border border-border px-2 py-0.5 text-[11px] hover:bg-muted-bg"
            >
              Đổi
            </button>
          </div>
        ) : (
          <button
            onClick={() => setPickerOpen(true)}
            className="rounded bg-ubl-primary px-3 py-1 text-xs font-medium text-white hover:bg-ubl-primary-dark"
          >
            Chọn sản phẩm
          </button>
        )}

        {/* Facing */}
        <label className="flex items-center gap-1 text-xs text-muted">
          Facing
          <input
            type="number"
            min={1}
            value={currentFacingQty}
            onChange={(e) => setCurrentFacingQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none focus:border-ubl-primary"
          />
        </label>
        {pendingCount > 0 && (
          <button
            onClick={applyFacingQtyToAllPending}
            title="Đổi Facing ở đây không tự sửa các ô đã bấm — bấm nút này nếu muốn áp cho tất cả"
            className="text-[11px] text-ubl-primary underline hover:no-underline"
          >
            Áp cho tất cả ô đang chờ
          </button>
        )}

        <span className="rounded bg-amber-200/70 px-2 py-0.5 text-xs font-medium text-amber-900">
          {pendingCount} ô đang chờ
          {pendingCount >= MAX_PENDING_ASSIGNMENTS ? " — đã đạt giới hạn, hãy Lưu" : ""}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={pendingCount === 0 || isPending}
            className="rounded bg-ubl-primary px-3 py-1 text-xs font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
          >
            {isPending ? "Đang lưu..." : `Lưu (${pendingCount})`}
          </button>
          <button
            onClick={handleCancel}
            className="rounded border border-border px-3 py-1 text-xs hover:bg-muted-bg"
          >
            Thoát
          </button>
        </div>
      </div>

      {/* Hướng dẫn / phản hồi */}
      <div className="px-4 pb-2 text-[11px]">
        {errorCount > 0 ? (
          <span className="text-red-600">
            {error?.message ?? `${errorCount} ô không hợp lệ`} — các ô lỗi được tô đỏ trên canvas.
          </span>
        ) : error ? (
          <span className="text-red-600">{error.message}</span>
        ) : lastReject ? (
          <span className="text-red-600">{STAMP_REJECT_MESSAGES[lastReject]}</span>
        ) : justSaved !== null ? (
          <span className="text-green-700">Đã lưu {justSaved} vị trí.</span>
        ) : (
          <span className="text-muted">
            Bấm vào ô trên canvas để gán. Bấm lại ô đó để bỏ. Chưa có gì được lưu cho tới khi bấm Lưu.
          </span>
        )}
      </div>

      {pickerOpen && (
        <ProductPicker
          onPick={(p) => {
            setCurrentProduct(p);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/** Chọn sản phẩm ngay trong thanh bar — không đụng tới selection state. */
function ProductPicker({
  onPick,
  onClose,
}: {
  onPick: (p: {
    productId: string;
    itemCode: string;
    description: string;
    imageUrl: string | null;
  }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useProducts(search);
  const products = data?.data ?? [];

  return (
    <div className="border-t border-border bg-card px-4 py-2">
      <div className="mb-2 flex items-center gap-2">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm Item Code, tên, category, brand..."
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-ubl-primary"
        />
        <button
          onClick={onClose}
          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted-bg"
        >
          Đóng
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {isLoading && <p className="p-2 text-xs text-muted">Đang tải...</p>}
        {!isLoading && products.length === 0 && (
          <p className="p-2 text-xs text-muted">Không tìm thấy Product nào.</p>
        )}
        {products.map((p) => (
          <button
            key={p.productId}
            onClick={() =>
              onPick({
                productId: p.productId,
                itemCode: p.itemCode,
                description: p.description,
                imageUrl: p.imageUrl ?? null,
              })
            }
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted-bg"
          >
            <ProductThumb url={p.imageUrl} alt={p.description} size={28} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs text-foreground">{p.description}</span>
              <span className="truncate text-[11px] text-muted">
                {p.itemCode}
                {p.brand ? ` · ${p.brand}` : ""}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
