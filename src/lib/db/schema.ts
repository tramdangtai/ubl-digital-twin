/**
 * Drizzle schema — nguồn sự thật cho Database Schema Phase 1.
 *
 * Theo Part 03 (Database Schema & Entity Specification) + các quyết định đã chốt
 * trong CLAUDE.md ngày 2026-08-11 (mục "Quyết định nghiệp vụ đã chốt"):
 *   - retailer_code / store_code / fixture_code / item_code: unique TOÀN HỆ THỐNG.
 *   - product có thêm width_mm/height_mm/depth_mm (không có trong Part 03 gốc).
 *   - product_assignment.facing_qty >= 1 (refine từ Part 08 §21 vốn ghi >= 0).
 *   - display_position.capacity >= 0 (nullable), facing_limit >= 1 (nullable).
 *   - Không dùng ON DELETE CASCADE (TD-05 §13) — Phase 1 chỉ Soft Delete, cascade
 *     Archive được xử lý ở Service layer, không phải Database layer.
 */
import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Tham chiếu tối thiểu tới `auth.users` do Supabase Auth quản lý (schema
 * `auth`, không phải schema `public` của app) — chỉ khai báo đủ để làm FK
 * target cho `user_profile`, không migrate/sở hữu bảng này.
 */
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

const statusColumn = () => text("status").notNull().default("Active");

// ---------------------------------------------------------------------------
// Retailer
// ---------------------------------------------------------------------------
export const retailer = pgTable(
  "retailer",
  {
    retailerId: uuid("retailer_id").primaryKey().defaultRandom(),
    retailerCode: text("retailer_code").notNull(),
    retailerName: text("retailer_name").notNull(),
    status: statusColumn(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("uq_retailer_code").on(table.retailerCode),
    check("retailer_status_check", sql`${table.status} IN ('Active', 'Archived')`),
  ]
);

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const store = pgTable(
  "store",
  {
    storeId: uuid("store_id").primaryKey().defaultRandom(),
    retailerId: uuid("retailer_id")
      .notNull()
      .references(() => retailer.retailerId, { onDelete: "restrict" }),
    storeCode: text("store_code").notNull(),
    storeName: text("store_name").notNull(),
    address: text("address"),
    status: statusColumn(),
    ...timestamps,
  },
  (table) => [
    index("idx_store_retailer").on(table.retailerId),
    uniqueIndex("uq_store_code").on(table.storeCode),
    check("store_status_check", sql`${table.status} IN ('Active', 'Archived')`),
  ]
);

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------
export const fixture = pgTable(
  "fixture",
  {
    fixtureId: uuid("fixture_id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => store.storeId, { onDelete: "restrict" }),
    fixtureCode: text("fixture_code").notNull(),
    fixtureName: text("fixture_name").notNull(),
    ownerCompany: text("owner_company").notNull(),
    fixtureType: text("fixture_type"),
    widthMm: numeric("width_mm", { precision: 10, scale: 2, mode: "number" }).notNull(),
    heightMm: numeric("height_mm", { precision: 10, scale: 2, mode: "number" }).notNull(),
    depthMm: numeric("depth_mm", { precision: 10, scale: 2, mode: "number" }).notNull(),
    // Store coordinate system — xem CLAUDE.md quyết định #3.
    // position_x/position_y = góc trên-trái bounding box TRƯỚC khi xoay, đơn vị mm.
    positionX: numeric("position_x", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    positionY: numeric("position_y", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    // Xoay thuận chiều kim đồng hồ quanh TÂM bounding box.
    rotationDegree: numeric("rotation_degree", { precision: 6, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    status: statusColumn(),
    ...timestamps,
  },
  (table) => [
    index("idx_fixture_store").on(table.storeId),
    uniqueIndex("uq_fixture_code").on(table.fixtureCode),
    check("fixture_width_check", sql`${table.widthMm} > 0`),
    check("fixture_height_check", sql`${table.heightMm} > 0`),
    check("fixture_depth_check", sql`${table.depthMm} > 0`),
    check(
      "fixture_owner_company_check",
      sql`${table.ownerCompany} IN ('Uncel Bills', 'Competitor')`
    ),
    check("fixture_status_check", sql`${table.status} IN ('Active', 'Archived')`),
  ]
);

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------
export const surface = pgTable(
  "surface",
  {
    surfaceId: uuid("surface_id").primaryKey().defaultRandom(),
    fixtureId: uuid("fixture_id")
      .notNull()
      .references(() => fixture.fixtureId, { onDelete: "restrict" }),
    surfaceName: text("surface_name"),
    orientation: text("orientation").notNull(),
    widthMm: numeric("width_mm", { precision: 10, scale: 2, mode: "number" }).notNull(),
    heightMm: numeric("height_mm", { precision: 10, scale: 2, mode: "number" }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: statusColumn(),
    ...timestamps,
  },
  (table) => [
    index("idx_surface_fixture").on(table.fixtureId),
    check("surface_width_check", sql`${table.widthMm} > 0`),
    check("surface_height_check", sql`${table.heightMm} > 0`),
    check(
      "surface_orientation_check",
      sql`${table.orientation} IN ('Front', 'Back', 'Left', 'Right', 'Top')`
    ),
    check("surface_status_check", sql`${table.status} IN ('Active', 'Archived')`),
    // Giai đoạn 3: 1 Fixture không được có 2 Surface Active cùng orientation
    // (vật lý không có 2 mặt "Front" cùng lúc) — quyết định implement, xem
    // CLAUDE.md.
    uniqueIndex("uq_surface_active_orientation")
      .on(table.fixtureId, table.orientation)
      .where(sql`${table.status} = 'Active'`),
  ]
);

// ---------------------------------------------------------------------------
// Display Position
// ---------------------------------------------------------------------------
export const displayPosition = pgTable(
  "display_position",
  {
    positionId: uuid("position_id").primaryKey().defaultRandom(),
    surfaceId: uuid("surface_id")
      .notNull()
      .references(() => surface.surfaceId, { onDelete: "restrict" }),
    displayType: text("display_type").notNull(),
    // Surface coordinate system — xem CLAUDE.md quyết định #3.
    // Origin = góc trên-trái Surface (nhìn trực diện); y=0 là vị trí TRÊN CÙNG,
    // y tăng dần khi xuống thấp (gần sàn). Không có rotation.
    x: numeric("x", { precision: 10, scale: 2, mode: "number" }).notNull(),
    y: numeric("y", { precision: 10, scale: 2, mode: "number" }).notNull(),
    widthMm: numeric("width_mm", { precision: 10, scale: 2, mode: "number" }).notNull(),
    heightMm: numeric("height_mm", { precision: 10, scale: 2, mode: "number" }).notNull(),
    // Ràng buộc vật lý (số lượng đơn vị sản phẩm chứa được) — khác facing_limit.
    capacity: integer("capacity"),
    // Ràng buộc nghiệp vụ (số facing merchandising cho phép).
    facingLimit: integer("facing_limit"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: statusColumn(),
    ...timestamps,
  },
  (table) => [
    index("idx_position_surface").on(table.surfaceId),
    check("position_width_check", sql`${table.widthMm} > 0`),
    check("position_height_check", sql`${table.heightMm} > 0`),
    check(
      "position_display_type_check",
      sql`${table.displayType} IN ('Shelf', 'Hook', 'Basket', 'Tray', 'Pegboard', 'Other')`
    ),
    check("position_capacity_check", sql`${table.capacity} IS NULL OR ${table.capacity} >= 0`),
    check(
      "position_facing_limit_check",
      sql`${table.facingLimit} IS NULL OR ${table.facingLimit} >= 1`
    ),
    check("position_status_check", sql`${table.status} IN ('Active', 'Archived')`),
  ]
);

// ---------------------------------------------------------------------------
// Product (Product Library — độc lập, không thuộc Store/Fixture)
// ---------------------------------------------------------------------------
export const product = pgTable(
  "product",
  {
    productId: uuid("product_id").primaryKey().defaultRandom(),
    itemCode: text("item_code").notNull(),
    description: text("description").notNull(),
    category: text("category"),
    productGroup: text("product_group"),
    brand: text("brand"),
    imageUrl: text("image_url"),
    // Bổ sung so với Part 03 gốc — xem CLAUDE.md quyết định #7.
    widthMm: numeric("width_mm", { precision: 10, scale: 2, mode: "number" }),
    heightMm: numeric("height_mm", { precision: 10, scale: 2, mode: "number" }),
    depthMm: numeric("depth_mm", { precision: 10, scale: 2, mode: "number" }),
    status: statusColumn(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("uq_product_item_code").on(table.itemCode),
    check("product_width_check", sql`${table.widthMm} IS NULL OR ${table.widthMm} > 0`),
    check("product_height_check", sql`${table.heightMm} IS NULL OR ${table.heightMm} > 0`),
    check("product_depth_check", sql`${table.depthMm} IS NULL OR ${table.depthMm} > 0`),
    check("product_status_check", sql`${table.status} IN ('Active', 'Archived')`),
  ]
);

// ---------------------------------------------------------------------------
// Product Assignment
// ---------------------------------------------------------------------------
export const productAssignment = pgTable(
  "product_assignment",
  {
    assignmentId: uuid("assignment_id").primaryKey().defaultRandom(),
    positionId: uuid("position_id")
      .notNull()
      .references(() => displayPosition.positionId, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.productId, { onDelete: "restrict" }),
    // >= 1, không phải >= 0 như Part 08 §21 — xem CLAUDE.md quyết định #6.
    facingQty: integer("facing_qty").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: statusColumn(),
    ...timestamps,
  },
  (table) => [
    index("idx_assignment_position").on(table.positionId),
    index("idx_assignment_product").on(table.productId),
    // Invariant quan trọng nhất Phase 1 (Part 03 §10, TD-05 §44):
    // một Display Position chỉ có tối đa 1 Active Assignment.
    uniqueIndex("uq_assignment_active_position")
      .on(table.positionId)
      .where(sql`${table.status} = 'Active'`),
    check("assignment_facing_qty_check", sql`${table.facingQty} >= 1`),
    check(
      "assignment_date_check",
      sql`${table.startDate} IS NULL OR ${table.endDate} IS NULL OR ${table.startDate} <= ${table.endDate}`
    ),
    check("assignment_status_check", sql`${table.status} IN ('Active', 'Archived')`),
  ]
);

// ---------------------------------------------------------------------------
// User Profile — Giai đoạn 6 (Auth & Authorization).
// ---------------------------------------------------------------------------
/**
 * Role model theo CLAUDE.md quyết định #1: Admin/Editor/Viewer.
 * `userId` = `auth.users.id` (Supabase Auth quản lý mật khẩu/session, app chỉ
 * lưu role + trạng thái). `onDelete: cascade` ở đây là ngoại lệ so với nguyên
 * tắc No Hard Delete (Part 01) — vì FK trỏ tới bảng hệ thống của Supabase
 * Auth (không phải entity nghiệp vụ), xoá user ở Auth là hành động Admin chủ
 * động hiếm khi làm; profile không có lý do tồn tại khi Auth user đã bị xoá.
 */
export const userProfile = pgTable(
  "user_profile",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name"),
    role: text("role").notNull().default("Viewer"),
    status: statusColumn(),
    ...timestamps,
  },
  (table) => [
    check("user_profile_role_check", sql`${table.role} IN ('Admin', 'Editor', 'Viewer')`),
    check("user_profile_status_check", sql`${table.status} IN ('Active', 'Archived')`),
  ]
);
