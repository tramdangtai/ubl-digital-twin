import type { DisplayType, OwnerCompany, SurfaceOrientation } from "@/lib/constants";

export type { DisplayType, OwnerCompany, SurfaceOrientation };

export type EntityStatus = "Active" | "Archived";

export interface Retailer {
  retailerId: string;
  retailerCode: string;
  retailerName: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  storeId: string;
  retailerId: string;
  storeCode: string;
  storeName: string;
  address: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Fixture {
  fixtureId: string;
  storeId: string;
  fixtureCode: string;
  fixtureName: string;
  ownerCompany: OwnerCompany;
  fixtureType: string | null;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  positionX: number;
  positionY: number;
  rotationDegree: number;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

/** Các field có thể chỉnh sửa của Fixture — dùng cho Draft State. */
export interface FixtureEditableFields {
  fixtureCode: string;
  fixtureName: string;
  ownerCompany: OwnerCompany;
  fixtureType: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  positionX: number;
  positionY: number;
  rotationDegree: number;
}

/** Giai đoạn 9 — Background Image cho Surface (CLAUDE.md quyết định E1-E7). */
export type BackgroundFit = "contain" | "cover" | "stretch";

export interface BackgroundImage {
  backgroundImageId: string;
  label: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  uploadedBy: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Surface {
  surfaceId: string;
  fixtureId: string;
  surfaceName: string | null;
  orientation: SurfaceOrientation;
  widthMm: number;
  heightMm: number;
  sortOrder: number;
  // Giai đoạn 9 — ảnh nền. null = không có ảnh nền.
  backgroundImageId: string | null;
  backgroundOpacity: number;
  backgroundFit: BackgroundFit;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DisplayPosition {
  positionId: string;
  surfaceId: string;
  displayType: DisplayType;
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  capacity: number | null;
  facingLimit: number | null;
  sortOrder: number;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

/** Các field có thể chỉnh sửa của Display Position — dùng cho Draft State. */
export interface DisplayPositionEditableFields {
  displayType: DisplayType;
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  capacity: number | null;
  facingLimit: number | null;
}

export interface Product {
  productId: string;
  itemCode: string;
  description: string;
  category: string | null;
  productGroup: string | null;
  brand: string | null;
  imageUrl: string | null;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAssignment {
  assignmentId: string;
  positionId: string;
  productId: string;
  facingQty: number;
  displayOrder: number;
  startDate: string | null;
  endDate: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Giai đoạn 8 A2 — AssignmentWithProduct dùng cho batch query by-surface,
 * thay thế pattern N+1 (1 query/position) trong workspace.tsx.
 */
export interface AssignmentWithProduct extends ProductAssignment {
  product: Product;
}

/** Giai đoạn 6 — Auth & Authorization (CLAUDE.md quyết định #1). */
export type UserRole = "Admin" | "Editor" | "Viewer";

export interface UserProfile {
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}
