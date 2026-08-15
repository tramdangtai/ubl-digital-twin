"use client";

import { useState } from "react";

import { canWrite, useCurrentUser } from "@/lib/api/hooks/use-current-user";
import { useDisplayPositions } from "@/lib/api/hooks/use-display-positions";
import { useFixtures } from "@/lib/api/hooks/use-fixtures";
import { useProducts } from "@/lib/api/hooks/use-products";
import { useRetailers } from "@/lib/api/hooks/use-retailers";
import { useStores } from "@/lib/api/hooks/use-stores";
import { useSurfaces } from "@/lib/api/hooks/use-surfaces";
import { PRODUCT_DND_MIME } from "@/lib/state/bulk-assign-draft";
import { useSelectionStore } from "@/lib/state/selection";
import type { Store } from "@/lib/types/entities";
import { ProductThumb } from "./product-thumb";

const rowClass = (active: boolean) =>
  `flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors hover:bg-muted-bg ${
    active ? "bg-ubl-primary/10 font-medium text-ubl-secondary" : ""
  }`;

export function Explorer({ onCollapse }: { onCollapse: () => void }) {
  const { explorerTab, setExplorerTab, startCreateRetailer, startCreateProduct } = useSelectionStore();
  const { data: me } = useCurrentUser();
  const writable = canWrite(me?.role);

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <button
          onClick={onCollapse}
          title="Thu gọn Explorer"
          className="rounded px-1 text-muted hover:bg-muted-bg hover:text-foreground"
        >
          ‹
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Explorer</span>
        {writable && (
          <button
            onClick={explorerTab === "twin" ? startCreateRetailer : startCreateProduct}
            className="rounded bg-ubl-primary px-2 py-1 text-xs font-medium text-white hover:bg-ubl-primary-dark"
          >
            {explorerTab === "twin" ? "+ Retailer" : "+ Product"}
          </button>
        )}
      </div>

      <div className="flex border-b border-border text-xs">
        <button
          onClick={() => setExplorerTab("twin")}
          className={`flex-1 py-1.5 font-medium ${
            explorerTab === "twin"
              ? "border-b-2 border-ubl-primary text-ubl-secondary"
              : "text-muted hover:text-foreground"
          }`}
        >
          Digital Twin
        </button>
        <button
          onClick={() => setExplorerTab("products")}
          className={`flex-1 py-1.5 font-medium ${
            explorerTab === "products"
              ? "border-b-2 border-ubl-primary text-ubl-secondary"
              : "text-muted hover:text-foreground"
          }`}
        >
          Product Library
        </button>
      </div>

      {explorerTab === "twin" ? <DigitalTwinTree /> : <ProductLibraryList />}
    </div>
  );
}

function DigitalTwinTree() {
  const { data: me } = useCurrentUser();
  const writable = canWrite(me?.role);
  const retailersQuery = useRetailers();
  const { data: retailers, isLoading, error } = retailersQuery;
  const { data: stores } = useStores();
  const {
    selectedRetailerId,
    selectedStoreId,
    selectedFixtureId,
    selectedSurfaceId,
    selectedDisplayPositionId,
    mode,
    selectRetailer,
    selectStore,
    selectFixture,
    selectSurface,
    selectDisplayPosition,
    startCreateStore,
    startCreateFixture,
    startCreateSurface,
    startCreateDisplayPosition,
    startBulkGenerate,
  } = useSelectionStore();

  // Chỉ 1 Store/Fixture/Surface được mở rộng tại 1 thời điểm nên gọi hook 1
  // lần ở top-level là đủ, không cần fetch theo từng node trong tree.
  const { data: fixtures } = useFixtures(selectedStoreId ?? undefined);
  const { data: surfaces } = useSurfaces(selectedFixtureId ?? undefined);
  const { data: positions } = useDisplayPositions(selectedSurfaceId ?? undefined);

  const storesByRetailer = new Map<string, Store[]>();
  for (const s of stores ?? []) {
    const list = storesByRetailer.get(s.retailerId) ?? [];
    list.push(s);
    storesByRetailer.set(s.retailerId, list);
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 text-sm">
      {isLoading && <p className="p-2 text-muted">Đang tải...</p>}
      {error && (
        <div className="m-2 rounded border border-red-200 bg-red-50 p-2">
          <p className="mb-1 text-xs font-medium text-red-700">
            Không tải được danh sách Retailer.
          </p>
          <p className="mb-2 text-[11px] text-red-600">
            Lỗi kết nối, dữ liệu vẫn còn nguyên trên máy chủ.
          </p>
          <button
            onClick={() => retailersQuery.refetch()}
            disabled={retailersQuery.isFetching}
            className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {retailersQuery.isFetching ? "Đang thử lại..." : "Thử lại"}
          </button>
        </div>
      )}
      {!isLoading && !error && retailers?.length === 0 && (
        <p className="p-2 text-muted">Chưa có Retailer nào. Bấm “+ Retailer” để tạo.</p>
      )}

      {retailers?.map((r) => {
        const isRetailerFocused = selectedRetailerId === r.retailerId;
        const isRetailerSelected = isRetailerFocused && !selectedStoreId && mode === "view";
        const childStores = storesByRetailer.get(r.retailerId) ?? [];

        return (
          <div key={r.retailerId} className="mb-1">
            <button
              onClick={() => selectRetailer(r.retailerId)}
              className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors hover:bg-muted-bg ${
                isRetailerSelected ? "bg-ubl-primary/10 font-medium text-ubl-secondary" : ""
              }`}
            >
              <span>{r.retailerName}</span>
              <span className="text-xs text-muted">{r.retailerCode}</span>
            </button>

            {isRetailerFocused && (
              <div className="ml-3 border-l border-border pl-2">
                {childStores.length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted">Chưa có Store.</p>
                )}
                {childStores.map((s) => {
                  const isStoreFocused = selectedStoreId === s.storeId;
                  const storeSelected = isStoreFocused && !selectedFixtureId && mode === "view";

                  return (
                    <div key={s.storeId}>
                      <button
                        onClick={() => selectStore(r.retailerId, s.storeId)}
                        className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm transition-colors hover:bg-muted-bg ${
                          storeSelected ? "bg-ubl-primary/10 font-medium text-ubl-secondary" : ""
                        }`}
                      >
                        <span>{s.storeName}</span>
                        <span className="text-xs text-muted">{s.storeCode}</span>
                      </button>

                      {isStoreFocused && (
                        <div className="ml-3 border-l border-border pl-2">
                          {(fixtures?.length ?? 0) === 0 && (
                            <p className="px-2 py-1 text-xs text-muted">Chưa có Fixture.</p>
                          )}
                          {fixtures?.map((f) => {
                            const isFixtureFocused = selectedFixtureId === f.fixtureId;
                            const fixtureSelected =
                              isFixtureFocused && !selectedSurfaceId && mode === "view";

                            return (
                              <div key={f.fixtureId}>
                                <button
                                  onClick={() => selectFixture(f.fixtureId)}
                                  className={rowClass(fixtureSelected)}
                                >
                                  <span>{f.fixtureName}</span>
                                  <span className="text-muted">{f.fixtureCode}</span>
                                </button>

                                {isFixtureFocused && (
                                  <div className="ml-3 border-l border-border pl-2">
                                    {(surfaces?.length ?? 0) === 0 && (
                                      <p className="px-2 py-1 text-[11px] text-muted">
                                        Chưa có Surface.
                                      </p>
                                    )}
                                    {surfaces?.map((surf) => {
                                      const isSurfaceFocused = selectedSurfaceId === surf.surfaceId;
                                      const surfaceSelected =
                                        isSurfaceFocused &&
                                        !selectedDisplayPositionId &&
                                        mode === "view";

                                      return (
                                        <div key={surf.surfaceId}>
                                          <button
                                            onClick={() => selectSurface(f.fixtureId, surf.surfaceId)}
                                            className={rowClass(surfaceSelected)}
                                          >
                                            <span>{surf.surfaceName || surf.orientation}</span>
                                            <span className="text-muted">{surf.orientation}</span>
                                          </button>

                                          {isSurfaceFocused && (
                                            <div className="ml-3 border-l border-border pl-2">
                                              {(positions?.length ?? 0) === 0 && (
                                                <p className="px-2 py-1 text-[11px] text-muted">
                                                  Chưa có Display Position.
                                                </p>
                                              )}
                                              {positions?.map((p) => {
                                                const positionSelected =
                                                  selectedDisplayPositionId === p.positionId &&
                                                  mode === "view";
                                                return (
                                                  <button
                                                    key={p.positionId}
                                                    onClick={() =>
                                                      selectDisplayPosition(surf.surfaceId, p.positionId)
                                                    }
                                                    className={rowClass(positionSelected)}
                                                  >
                                                    <span>{p.displayType}</span>
                                                    <span className="text-muted">
                                                      ({p.x}, {p.y})
                                                    </span>
                                                  </button>
                                                );
                                              })}
                                              {writable && (
                                                <>
                                                  <button
                                                    onClick={startCreateDisplayPosition}
                                                    className="w-full rounded px-2 py-1 text-left text-[11px] text-ubl-primary hover:bg-muted-bg"
                                                  >
                                                    + Add Display Position
                                                  </button>
                                                  <button
                                                    onClick={startBulkGenerate}
                                                    className="w-full rounded px-2 py-1 text-left text-[11px] text-ubl-primary hover:bg-muted-bg"
                                                  >
                                                    + Bulk Generate...
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {writable && (
                                      <button
                                        onClick={() => startCreateSurface(f.fixtureId)}
                                        className="w-full rounded px-2 py-1 text-left text-[11px] text-ubl-primary hover:bg-muted-bg"
                                      >
                                        + Add Surface
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {writable && (
                            <button
                              onClick={startCreateFixture}
                              className="w-full rounded px-2 py-1 text-left text-xs text-ubl-primary hover:bg-muted-bg"
                            >
                              + Add Fixture
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {writable && (
                  <button
                    onClick={() => startCreateStore(r.retailerId)}
                    className="w-full rounded px-2 py-1 text-left text-xs text-ubl-primary hover:bg-muted-bg"
                  >
                    + Add Store
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductLibraryList() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useProducts(search);
  const { selectedProductId, mode, selectProduct, selectedSurfaceId } = useSelectionStore();
  const { data: me } = useCurrentUser();
  const writable = canWrite(me?.role);

  const products = data?.data ?? [];
  // Chỉ kéo-thả được khi đang mở một Surface và có quyền ghi — thả vào đâu bây
  // giờ nếu chưa mở Surface nào.
  const draggable = writable && Boolean(selectedSurfaceId);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border p-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm Item Code, tên, category, brand..."
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-ubl-primary"
        />
      </div>
      {draggable && (
        <p className="border-b border-border bg-ubl-primary/5 px-2 py-1 text-[11px] text-muted">
          Mẹo: kéo sản phẩm thả thẳng vào ô trên canvas để gán.
        </p>
      )}
      <div className="flex-1 overflow-y-auto p-2 text-sm">
        {isLoading && <p className="p-2 text-muted">Đang tải...</p>}
        {error && <p className="p-2 text-red-600">Không tải được danh sách Product.</p>}
        {!isLoading && products.length === 0 && (
          <p className="p-2 text-muted">
            {search ? "Không tìm thấy Product nào." : "Chưa có Product nào. Bấm “+ Product” để tạo."}
          </p>
        )}
        {products.map((p) => {
          const selected = selectedProductId === p.productId && mode === "view";
          return (
            <button
              key={p.productId}
              onClick={() => selectProduct(p.productId)}
              draggable={draggable}
              onDragStart={(e) => {
                if (!draggable) return;
                e.dataTransfer.setData(
                  PRODUCT_DND_MIME,
                  JSON.stringify({
                    productId: p.productId,
                    itemCode: p.itemCode,
                    description: p.description,
                    imageUrl: p.imageUrl ?? null,
                  })
                );
                e.dataTransfer.effectAllowed = "copy";
              }}
              title={draggable ? "Kéo thả vào một ô trên canvas để gán" : undefined}
              className={`mb-1 flex w-full flex-row items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-muted-bg ${
                selected ? "bg-ubl-primary/10" : ""
              } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
              <ProductThumb url={p.imageUrl} alt={p.description} size={32} />
              <div className="flex min-w-0 flex-col">
                <span
                  className={`truncate text-sm ${selected ? "font-medium text-ubl-secondary" : "text-foreground"}`}
                >
                  {p.description}
                </span>
                <span className="truncate text-xs text-muted">
                  {p.itemCode}
                  {p.brand ? ` · ${p.brand}` : ""}
                </span>
              </div>
            </button>
          );
        })}
        {data?.meta && data.meta.total > products.length && (
          <p className="p-2 text-center text-xs text-muted">
            Hiện {products.length}/{data.meta.total} — thu hẹp tìm kiếm để xem thêm.
          </p>
        )}
      </div>
    </div>
  );
}
