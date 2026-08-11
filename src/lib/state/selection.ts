import { create } from "zustand";

/**
 * Selection / Interaction Mode State — Part 05 §7-8, §10.
 * Không phải Business Data, không ghi Database.
 */
interface SelectionState {
  selectedRetailerId: string | null;
  selectedStoreId: string | null;
  selectedFixtureId: string | null;
  selectedSurfaceId: string | null;
  selectedDisplayPositionId: string | null;
  mode:
    | "view"
    | "create-retailer"
    | "create-store"
    | "create-fixture"
    | "create-surface"
    | "create-display-position"
    | "bulk-generate-display-position";

  selectRetailer: (retailerId: string) => void;
  selectStore: (retailerId: string, storeId: string) => void;
  selectFixture: (fixtureId: string) => void;
  selectSurface: (fixtureId: string, surfaceId: string) => void;
  selectDisplayPosition: (surfaceId: string, positionId: string) => void;
  startCreateRetailer: () => void;
  startCreateStore: (retailerId: string) => void;
  startCreateFixture: () => void;
  startCreateSurface: (fixtureId: string) => void;
  startCreateDisplayPosition: () => void;
  startBulkGenerate: () => void;
  cancelCreate: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedRetailerId: null,
  selectedStoreId: null,
  selectedFixtureId: null,
  selectedSurfaceId: null,
  selectedDisplayPositionId: null,
  mode: "view",

  selectRetailer: (retailerId) =>
    set({
      selectedRetailerId: retailerId,
      selectedStoreId: null,
      selectedFixtureId: null,
      selectedSurfaceId: null,
      selectedDisplayPositionId: null,
      mode: "view",
    }),
  selectStore: (retailerId, storeId) =>
    set({
      selectedRetailerId: retailerId,
      selectedStoreId: storeId,
      selectedFixtureId: null,
      selectedSurfaceId: null,
      selectedDisplayPositionId: null,
      mode: "view",
    }),
  selectFixture: (fixtureId) =>
    set({
      selectedFixtureId: fixtureId,
      selectedSurfaceId: null,
      selectedDisplayPositionId: null,
      mode: "view",
    }),
  selectSurface: (fixtureId, surfaceId) =>
    set({
      selectedFixtureId: fixtureId,
      selectedSurfaceId: surfaceId,
      selectedDisplayPositionId: null,
      mode: "view",
    }),
  selectDisplayPosition: (surfaceId, positionId) =>
    set({ selectedSurfaceId: surfaceId, selectedDisplayPositionId: positionId, mode: "view" }),

  startCreateRetailer: () => set({ mode: "create-retailer" }),
  startCreateStore: (retailerId) =>
    set({
      selectedRetailerId: retailerId,
      selectedStoreId: null,
      selectedFixtureId: null,
      selectedSurfaceId: null,
      selectedDisplayPositionId: null,
      mode: "create-store",
    }),
  startCreateFixture: () =>
    set({ selectedFixtureId: null, selectedSurfaceId: null, selectedDisplayPositionId: null, mode: "create-fixture" }),
  startCreateSurface: (fixtureId) =>
    set({
      selectedFixtureId: fixtureId,
      selectedSurfaceId: null,
      selectedDisplayPositionId: null,
      mode: "create-surface",
    }),
  startCreateDisplayPosition: () =>
    set({ selectedDisplayPositionId: null, mode: "create-display-position" }),
  startBulkGenerate: () => set({ selectedDisplayPositionId: null, mode: "bulk-generate-display-position" }),
  cancelCreate: () => set({ mode: "view" }),
}));
