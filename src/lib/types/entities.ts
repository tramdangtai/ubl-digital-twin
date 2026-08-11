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

export interface Surface {
  surfaceId: string;
  fixtureId: string;
  surfaceName: string | null;
  orientation: SurfaceOrientation;
  widthMm: number;
  heightMm: number;
  sortOrder: number;
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
