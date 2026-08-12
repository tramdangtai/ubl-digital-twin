import type { AssignmentWithProduct, DisplayPosition, Fixture, Retailer, Store, Surface } from "@/lib/types/entities";

/**
 * Context dùng chung cho cả PNG và CSV export.
 * Dựng một lần ở Workspace, truyền vào hàm export.
 */
export interface SurfaceExportContext {
  retailer: Retailer;
  store: Store;
  fixture: Fixture;
  surface: Surface;
  /** Chỉ các Display Position Active. */
  positions: DisplayPosition[];
  /** Map<positionId, AssignmentWithProduct> — O(1) lookup. */
  assignmentByPositionId: Map<string, AssignmentWithProduct>;
}
