"use client";

import { useFixtures } from "@/lib/api/hooks/use-fixtures";
import { useRetailers } from "@/lib/api/hooks/use-retailers";
import { useStores } from "@/lib/api/hooks/use-stores";
import { useSelectionStore } from "@/lib/state/selection";
import type { Store } from "@/lib/types/entities";

export function Explorer({ onCollapse }: { onCollapse: () => void }) {
  const { data: retailers, isLoading, error } = useRetailers();
  const { data: stores } = useStores();
  const {
    selectedRetailerId,
    selectedStoreId,
    selectedFixtureId,
    mode,
    selectRetailer,
    selectStore,
    selectFixture,
    startCreateRetailer,
    startCreateStore,
    startCreateFixture,
  } = useSelectionStore();

  // Chỉ 1 Store được mở rộng tại 1 thời điểm nên gọi hook 1 lần ở top-level là đủ.
  const { data: fixtures } = useFixtures(selectedStoreId ?? undefined);

  const storesByRetailer = new Map<string, Store[]>();
  for (const s of stores ?? []) {
    const list = storesByRetailer.get(s.retailerId) ?? [];
    list.push(s);
    storesByRetailer.set(s.retailerId, list);
  }

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
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Explorer
        </span>
        <button
          onClick={startCreateRetailer}
          className="rounded bg-ubl-primary px-2 py-1 text-xs font-medium text-white hover:bg-ubl-primary-dark"
        >
          + Retailer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 text-sm">
        {isLoading && <p className="p-2 text-muted">Đang tải...</p>}
        {error && <p className="p-2 text-red-600">Không tải được danh sách Retailer.</p>}
        {retailers?.length === 0 && (
          <p className="p-2 text-muted">Chưa có Retailer nào. Bấm “+ Retailer” để tạo.</p>
        )}

        {retailers?.map((r) => {
          const isRetailerFocused = selectedRetailerId === r.retailerId;
          const isRetailerSelected =
            isRetailerFocused && !selectedStoreId && mode === "view";
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
                              const fixtureSelected =
                                selectedFixtureId === f.fixtureId && mode === "view";
                              return (
                                <button
                                  key={f.fixtureId}
                                  onClick={() => selectFixture(f.fixtureId)}
                                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors hover:bg-muted-bg ${
                                    fixtureSelected
                                      ? "bg-ubl-primary/10 font-medium text-ubl-secondary"
                                      : ""
                                  }`}
                                >
                                  <span>{f.fixtureName}</span>
                                  <span className="text-muted">{f.fixtureCode}</span>
                                </button>
                              );
                            })}
                            <button
                              onClick={startCreateFixture}
                              className="w-full rounded px-2 py-1 text-left text-xs text-ubl-primary hover:bg-muted-bg"
                            >
                              + Add Fixture
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={() => startCreateStore(r.retailerId)}
                    className="w-full rounded px-2 py-1 text-left text-xs text-ubl-primary hover:bg-muted-bg"
                  >
                    + Add Store
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
