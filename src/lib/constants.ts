/**
 * Shared constants — aligned with specification Part 02 / Part 08.
 */

export const ENTITY_STATUS = ["active", "inactive", "archived"] as const;
export type EntityStatus = (typeof ENTITY_STATUS)[number];

export const FIXTURE_TYPES = [
  "Gondola",
  "Endcap",
  "Wall Bay",
  "Island Display",
  "Counter Display",
] as const;
export type FixtureType = (typeof FIXTURE_TYPES)[number];

export const OWNER_COMPANIES = ["Uncel Bills", "Competitor"] as const;
export type OwnerCompany = (typeof OWNER_COMPANIES)[number];

export const SURFACE_ORIENTATIONS = ["Front", "Back", "Left", "Right", "Top"] as const;
export type SurfaceOrientation = (typeof SURFACE_ORIENTATIONS)[number];

export const DISPLAY_TYPES = [
  "Shelf",
  "Hook",
  "Basket",
  "Tray",
  "Pegboard",
  "Other",
] as const;
export type DisplayType = (typeof DISPLAY_TYPES)[number];

export const USER_ROLES = ["admin", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Visual treatment — UBL from ubl.vn, Competitor neutral gray */
export const OWNER_VISUAL: Record<
  OwnerCompany,
  { fill: string; border: string; label: string }
> = {
  "Uncel Bills": {
    fill: "#fef3e8",
    border: "#e85d04",
    label: "Uncel Bills",
  },
  Competitor: {
    fill: "#f3f4f6",
    border: "#6b7280",
    label: "Competitor",
  },
};
