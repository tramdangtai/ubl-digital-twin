import { create } from "zustand";

import { confirmDiscardUnsavedChanges } from "./unsaved-changes";

/**
 * Selection / Interaction Mode State — Part 05 §7-8, §10.
 * Không phải Business Data, không ghi Database.
 *
 * `selectedProductId` độc lập với cây Digital Twin (Retailer→...→Display
 * Position) — Product Library không thuộc hierarchy đó (Part 04 §4). Chọn
 * Product KHÔNG tự xoá selection Digital Twin và ngược lại (Part 04 §13:
 * "Product Selection ≠ Product Assignment"). `explorerTab` quyết định
 * Inspector ưu tiên hiện nhánh nào khi cả 2 đều có giá trị.
 */
interface SelectionState {
  explorerTab: "twin" | "products";
  selectedRetailerId: string | null;
  selectedStoreId: string | null;
  selectedFixtureId: string | null;
  selectedSurfaceId: string | null;
  selectedDisplayPositionId: string | null;
  selectedProductId: string | null;
  mode:
    | "view"
    | "create-retailer"
    | "create-store"
    | "create-fixture"
    | "create-surface"
    | "create-display-position"
    | "bulk-generate-display-position"
    | "create-product"
    | "assign-product";

  setExplorerTab: (tab: "twin" | "products") => void;
  selectRetailer: (retailerId: string) => void;
  selectStore: (retailerId: string, storeId: string) => void;
  selectFixture: (fixtureId: string) => void;
  selectSurface: (fixtureId: string, surfaceId: string) => void;
  selectDisplayPosition: (surfaceId: string, positionId: string) => void;
  selectProduct: (productId: string) => void;
  startCreateRetailer: () => void;
  startCreateStore: (retailerId: string) => void;
  startCreateFixture: () => void;
  startCreateSurface: (fixtureId: string) => void;
  startCreateDisplayPosition: () => void;
  startBulkGenerate: () => void;
  startCreateProduct: () => void;
  startAssignProduct: () => void;
  cancelCreate: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  explorerTab: "twin",
  selectedRetailerId: null,
  selectedStoreId: null,
  selectedFixtureId: null,
  selectedSurfaceId: null,
  selectedDisplayPositionId: null,
  selectedProductId: null,
  mode: "view",

  setExplorerTab: (tab) => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({ explorerTab: tab, mode: "view" });
  },

  selectRetailer: (retailerId) => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({
      explorerTab: "twin",
      selectedRetailerId: retailerId,
      selectedStoreId: null,
      selectedFixtureId: null,
      selectedSurfaceId: null,
      selectedDisplayPositionId: null,
      mode: "view",
    });
  },
  selectStore: (retailerId, storeId) => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({
      explorerTab: "twin",
      selectedRetailerId: retailerId,
      selectedStoreId: storeId,
      selectedFixtureId: null,
      selectedSurfaceId: null,
      selectedDisplayPositionId: null,
      mode: "view",
    });
  },
  selectFixture: (fixtureId) => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({
      explorerTab: "twin",
      selectedFixtureId: fixtureId,
      selectedSurfaceId: null,
      selectedDisplayPositionId: null,
      mode: "view",
    });
  },
  selectSurface: (fixtureId, surfaceId) => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({
      explorerTab: "twin",
      selectedFixtureId: fixtureId,
      selectedSurfaceId: surfaceId,
      selectedDisplayPositionId: null,
      mode: "view",
    });
  },
  selectDisplayPosition: (surfaceId, positionId) => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({
      explorerTab: "twin",
      selectedSurfaceId: surfaceId,
      selectedDisplayPositionId: positionId,
      mode: "view",
    });
  },
  selectProduct: (productId) => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({ explorerTab: "products", selectedProductId: productId, mode: "view" });
  },

  startCreateRetailer: () => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({ explorerTab: "twin", mode: "create-retailer" });
  },
  startCreateStore: (retailerId) => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({
      explorerTab: "twin",
      selectedRetailerId: retailerId,
      selectedStoreId: null,
      selectedFixtureId: null,
      selectedSurfaceId: null,
      selectedDisplayPositionId: null,
      mode: "create-store",
    });
  },
  startCreateFixture: () => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({
      explorerTab: "twin",
      selectedFixtureId: null,
      selectedSurfaceId: null,
      selectedDisplayPositionId: null,
      mode: "create-fixture",
    });
  },
  startCreateSurface: (fixtureId) => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({
      explorerTab: "twin",
      selectedFixtureId: fixtureId,
      selectedSurfaceId: null,
      selectedDisplayPositionId: null,
      mode: "create-surface",
    });
  },
  startCreateDisplayPosition: () => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({ explorerTab: "twin", selectedDisplayPositionId: null, mode: "create-display-position" });
  },
  startBulkGenerate: () => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({ explorerTab: "twin", selectedDisplayPositionId: null, mode: "bulk-generate-display-position" });
  },
  startCreateProduct: () => {
    if (!confirmDiscardUnsavedChanges()) return;
    set({ explorerTab: "products", selectedProductId: null, mode: "create-product" });
  },
  startAssignProduct: () => set({ mode: "assign-product" }),
  cancelCreate: () => set({ mode: "view" }),
}));
