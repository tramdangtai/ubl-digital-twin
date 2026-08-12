"use client";

import { useEffect, useState } from "react";

import { useCreateProductAssignment } from "@/lib/api/hooks/use-product-assignments";
import { useCreateProduct, useUpdateProduct } from "@/lib/api/hooks/use-products";
import { useSelectionStore } from "@/lib/state/selection";
import type { Product } from "@/lib/types/entities";

import { canWrite, useCurrentUser } from "@/lib/api/hooks/use-current-user";

import {
  DetailRow,
  FieldErrors,
  GeneralError,
  inputClass,
  StatusBadge,
  UnsavedBadge,
  useSyncDirty,
} from "./inspector-shared";

// ---------------------------------------------------------------------------
// Create Product
// ---------------------------------------------------------------------------
export function CreateProductPanel({ onCancel }: { onCancel: () => void }) {
  const [itemCode, setItemCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [productGroup, setProductGroup] = useState("");
  const [brand, setBrand] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const [depthMm, setDepthMm] = useState("");
  const { mutate, isPending, error, reset } = useCreateProduct();
  const { selectProduct } = useSelectionStore();

  const parseOptionalPositive = (v: string) => (v.trim() ? Number(v) : undefined);
  const width = parseOptionalPositive(widthMm);
  const height = parseOptionalPositive(heightMm);
  const depth = parseOptionalPositive(depthMm);
  const dimensionsValid =
    (width === undefined || (Number.isFinite(width) && width > 0)) &&
    (height === undefined || (Number.isFinite(height) && height > 0)) &&
    (depth === undefined || (Number.isFinite(depth) && depth > 0));

  return (
    <>
      <h3 className="mb-3 font-semibold text-ubl-secondary">Tạo Product mới</h3>
      <GeneralError error={error} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Item Code *</span>
        <input
          className={inputClass}
          value={itemCode}
          onChange={(e) => {
            setItemCode(e.target.value);
            reset();
          }}
        />
        <FieldErrors error={error} field="itemCode" />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Description *</span>
        <input
          className={inputClass}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            reset();
          }}
        />
        <FieldErrors error={error} field="description" />
      </label>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Category</span>
          <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Product Group</span>
          <input
            className={inputClass}
            value={productGroup}
            onChange={(e) => setProductGroup(e.target.value)}
          />
        </label>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Brand</span>
        <input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Image URL</span>
        <input className={inputClass} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </label>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Width (mm)</span>
          <input
            type="number"
            className={inputClass}
            value={widthMm}
            onChange={(e) => setWidthMm(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Height (mm)</span>
          <input
            type="number"
            className={inputClass}
            value={heightMm}
            onChange={(e) => setHeightMm(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Depth (mm)</span>
          <input
            type="number"
            className={inputClass}
            value={depthMm}
            onChange={(e) => setDepthMm(e.target.value)}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          disabled={isPending || !itemCode.trim() || !description.trim() || !dimensionsValid}
          onClick={() =>
            mutate(
              {
                itemCode,
                description,
                category: category.trim() || undefined,
                productGroup: productGroup.trim() || undefined,
                brand: brand.trim() || undefined,
                imageUrl: imageUrl.trim() || undefined,
                widthMm: width,
                heightMm: height,
                depthMm: depth,
              },
              { onSuccess: (data) => selectProduct(data.productId) }
            )
          }
          className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
        >
          {isPending ? "Đang lưu..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Product Detail
// ---------------------------------------------------------------------------
export function ProductDetailPanel({ product }: { product: Product }) {
  const { data: me } = useCurrentUser();
  const writable = canWrite(me?.role);
  const [draft, setDraft] = useState({
    itemCode: product.itemCode,
    description: product.description,
    category: product.category ?? "",
    productGroup: product.productGroup ?? "",
    brand: product.brand ?? "",
    imageUrl: product.imageUrl ?? "",
  });
  const { mutate, isPending, error, reset } = useUpdateProduct(product.productId);
  const { selectedDisplayPositionId, startAssignProduct } = useSelectionStore();

  useEffect(() => {
    setDraft({
      itemCode: product.itemCode,
      description: product.description,
      category: product.category ?? "",
      productGroup: product.productGroup ?? "",
      brand: product.brand ?? "",
      imageUrl: product.imageUrl ?? "",
    });
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.productId]);

  const isDirty =
    draft.itemCode !== product.itemCode ||
    draft.description !== product.description ||
    draft.category !== (product.category ?? "") ||
    draft.productGroup !== (product.productGroup ?? "") ||
    draft.brand !== (product.brand ?? "") ||
    draft.imageUrl !== (product.imageUrl ?? "");
  useSyncDirty(isDirty);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-ubl-secondary">Product</h3>
        <div className="flex items-center gap-2">
          <UnsavedBadge isDirty={isDirty} />
          <StatusBadge status={product.status} />
        </div>
      </div>
      <GeneralError error={error} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Item Code</span>
        <input
          className={inputClass}
          value={draft.itemCode}
          disabled={product.status === "Archived" || !writable}
          onChange={(e) => setDraft((d) => ({ ...d, itemCode: e.target.value }))}
        />
        <FieldErrors error={error} field="itemCode" />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Description</span>
        <input
          className={inputClass}
          value={draft.description}
          disabled={product.status === "Archived" || !writable}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
        />
        <FieldErrors error={error} field="description" />
      </label>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Category</span>
          <input
            className={inputClass}
            value={draft.category}
            disabled={product.status === "Archived" || !writable}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Product Group</span>
          <input
            className={inputClass}
            value={draft.productGroup}
            disabled={product.status === "Archived" || !writable}
            onChange={(e) => setDraft((d) => ({ ...d, productGroup: e.target.value }))}
          />
        </label>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Brand</span>
        <input
          className={inputClass}
          value={draft.brand}
          disabled={product.status === "Archived" || !writable}
          onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-medium text-muted">Image URL</span>
        <input
          className={inputClass}
          value={draft.imageUrl}
          disabled={product.status === "Archived" || !writable}
          onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value }))}
        />
      </label>

      <DetailRow
        label="Width × Height × Depth (mm)"
        value={
          product.widthMm && product.heightMm && product.depthMm
            ? `${product.widthMm} × ${product.heightMm} × ${product.depthMm}`
            : "—"
        }
      />

      {product.status === "Active" && writable && (
        <>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                disabled={!isDirty || isPending}
                onClick={() => mutate({ ...draft, expectedUpdatedAt: product.updatedAt })}
                className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
              >
                {isPending ? "Đang lưu..." : "Save"}
              </button>
              {isDirty && (
                <button
                  onClick={() =>
                    setDraft({
                      itemCode: product.itemCode,
                      description: product.description,
                      category: product.category ?? "",
                      productGroup: product.productGroup ?? "",
                      brand: product.brand ?? "",
                      imageUrl: product.imageUrl ?? "",
                    })
                  }
                  className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
                >
                  Cancel
                </button>
              )}
            </div>
            <button
              onClick={() => {
                if (confirm("Archive Product này? Các Assignment hiện có vẫn giữ nguyên.")) {
                  mutate({ status: "Archived", expectedUpdatedAt: product.updatedAt });
                }
              }}
              className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Archive
            </button>
          </div>

          {selectedDisplayPositionId ? (
            <button
              onClick={startAssignProduct}
              className="mt-4 w-full rounded bg-ubl-secondary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Gán Product này vào Display Position đã chọn
            </button>
          ) : (
            <p className="mt-4 text-xs text-muted">
              Chọn 1 Display Position ở tab “Digital Twin” để gán Product này vào đó.
            </p>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Assign Product — Part 04 §13-14: Product Selection ≠ Product Assignment,
// chỉ tạo record khi user xác nhận ở đây.
// ---------------------------------------------------------------------------
export function AssignProductPanel({
  positionId,
  product,
  onCancel,
}: {
  positionId: string;
  product: Product;
  onCancel: () => void;
}) {
  const [facingQty, setFacingQty] = useState("1");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { mutate, isPending, error, reset } = useCreateProductAssignment();
  const { cancelCreate } = useSelectionStore();

  const facingQtyNum = Number(facingQty);
  const displayOrderNum = Number(displayOrder);
  const isValid =
    Number.isInteger(facingQtyNum) &&
    facingQtyNum >= 1 &&
    Number.isInteger(displayOrderNum) &&
    (!startDate || !endDate || startDate <= endDate);

  return (
    <>
      <h3 className="mb-3 font-semibold text-ubl-secondary">Gán Product vào Display Position</h3>
      <div className="mb-4 rounded bg-ubl-primary/10 px-3 py-2 text-sm text-ubl-secondary">
        {product.description} <span className="text-muted">({product.itemCode})</span>
      </div>
      <GeneralError error={error} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Facing Quantity *</span>
        <input
          type="number"
          className={inputClass}
          value={facingQty}
          onChange={(e) => {
            setFacingQty(e.target.value);
            reset();
          }}
        />
        <FieldErrors error={error} field="facingQty" />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">Display Order</span>
        <input
          type="number"
          className={inputClass}
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
        />
      </label>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Start Date</span>
          <input
            type="date"
            className={inputClass}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">End Date</span>
          <input
            type="date"
            className={inputClass}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <FieldErrors error={error} field="endDate" />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          disabled={isPending || !isValid}
          onClick={() =>
            mutate(
              {
                positionId,
                productId: product.productId,
                facingQty: facingQtyNum,
                displayOrder: displayOrderNum,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
              },
              { onSuccess: () => cancelCreate() }
            )
          }
          className="rounded bg-ubl-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-ubl-primary-dark disabled:opacity-50"
        >
          {isPending ? "Đang gán..." : "Xác nhận gán"}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
        >
          Cancel
        </button>
      </div>
    </>
  );
}
