import { create } from "zustand";

/**
 * Selection / Interaction Mode State — Part 05 §7-8, §10.
 * Không phải Business Data, không ghi Database.
 */
interface SelectionState {
  selectedRetailerId: string | null;
  selectedStoreId: string | null;
  selectedFixtureId: string | null;
  mode: "view" | "create-retailer" | "create-store" | "create-fixture";

  selectRetailer: (retailerId: string) => void;
  selectStore: (retailerId: string, storeId: string) => void;
  selectFixture: (fixtureId: string) => void;
  startCreateRetailer: () => void;
  startCreateStore: (retailerId: string) => void;
  startCreateFixture: () => void;
  cancelCreate: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedRetailerId: null,
  selectedStoreId: null,
  selectedFixtureId: null,
  mode: "view",

  selectRetailer: (retailerId) =>
    set({
      selectedRetailerId: retailerId,
      selectedStoreId: null,
      selectedFixtureId: null,
      mode: "view",
    }),
  selectStore: (retailerId, storeId) =>
    set({
      selectedRetailerId: retailerId,
      selectedStoreId: storeId,
      selectedFixtureId: null,
      mode: "view",
    }),
  selectFixture: (fixtureId) => set({ selectedFixtureId: fixtureId, mode: "view" }),
  startCreateRetailer: () => set({ mode: "create-retailer" }),
  startCreateStore: (retailerId) =>
    set({
      selectedRetailerId: retailerId,
      selectedStoreId: null,
      selectedFixtureId: null,
      mode: "create-store",
    }),
  startCreateFixture: () => set({ selectedFixtureId: null, mode: "create-fixture" }),
  cancelCreate: () => set({ mode: "view" }),
}));
