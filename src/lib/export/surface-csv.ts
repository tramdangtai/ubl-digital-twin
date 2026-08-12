import type { SurfaceExportContext } from "./types";

/**
 * Quyết định D4: CSV chứa mọi Display Position Active, kể cả ô trống.
 * Sắp xếp theo y rồi x (thứ tự đọc: trên xuống dưới, trái sang phải).
 * BOM + \r\n: Excel Windows hiển thị tiếng Việt đúng dấu.
 *
 * Cột (theo thứ tự spec):
 * stt, retailer_code, retailer_name, store_code, store_name, fixture_code, fixture_name,
 * surface_name, surface_orientation, surface_width_mm, surface_height_mm,
 * display_type, x_mm, y_mm, width_mm, height_mm, capacity, facing_limit,
 * item_code, product_description, brand, category, product_group,
 * product_width_mm, product_height_mm, product_depth_mm,
 * facing_qty, display_order, start_date, end_date, exported_at
 */

function escapeCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  // Escape: giá trị chứa '"', ',', xuống dòng → bọc '"' và nhân đôi '"' bên trong.
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const HEADERS = [
  // stt khớp đúng số thứ tự vẽ trên file PNG (cùng thứ tự sort y→x) để chỉ
  // đích danh một ô khi trao đổi với retailer.
  "stt",
  "retailer_code",
  "retailer_name",
  "store_code",
  "store_name",
  "fixture_code",
  "fixture_name",
  "surface_name",
  "surface_orientation",
  "surface_width_mm",
  "surface_height_mm",
  "display_type",
  "x_mm",
  "y_mm",
  "width_mm",
  "height_mm",
  "capacity",
  "facing_limit",
  "item_code",
  "product_description",
  "brand",
  "category",
  "product_group",
  "product_width_mm",
  "product_height_mm",
  "product_depth_mm",
  "facing_qty",
  "display_order",
  "start_date",
  "end_date",
  "exported_at",
];

export function buildSurfaceCsv(ctx: SurfaceExportContext): string {
  const { retailer, store, fixture, surface, positions, assignmentByPositionId } = ctx;
  const exportedAt = new Date().toISOString();

  // Sắp xếp theo y rồi x — PHẢI trùng thứ tự với surface-png.ts để cột stt
  // khớp với số vẽ trên ảnh.
  const sorted = [...positions].sort((a, b) => a.y - b.y || a.x - b.x);

  const rows: string[][] = sorted.map((pos, idx) => {
    const asgn = assignmentByPositionId.get(pos.positionId);
    const prod = asgn?.product;

    return [
      String(idx + 1),
      retailer.retailerCode,
      retailer.retailerName,
      store.storeCode,
      store.storeName,
      fixture.fixtureCode,
      fixture.fixtureName,
      surface.surfaceName ?? surface.orientation,
      surface.orientation,
      String(surface.widthMm),
      String(surface.heightMm),
      pos.displayType,
      String(pos.x),
      String(pos.y),
      String(pos.widthMm),
      String(pos.heightMm),
      pos.capacity != null ? String(pos.capacity) : "",
      pos.facingLimit != null ? String(pos.facingLimit) : "",
      prod?.itemCode ?? "",
      prod?.description ?? "",
      prod?.brand ?? "",
      prod?.category ?? "",
      prod?.productGroup ?? "",
      prod?.widthMm != null ? String(prod.widthMm) : "",
      prod?.heightMm != null ? String(prod.heightMm) : "",
      prod?.depthMm != null ? String(prod.depthMm) : "",
      asgn ? String(asgn.facingQty) : "",
      asgn ? String(asgn.displayOrder) : "",
      asgn?.startDate ?? "",
      asgn?.endDate ?? "",
      exportedAt,
    ];
  });

  const lines: string[] = [
    HEADERS.map(escapeCell).join(","),
    ...rows.map((r) => r.map(escapeCell).join(",")),
  ];

  // \r\n để Excel Windows đọc đúng, BOM thêm ở workspace.tsx khi tạo Blob.
  return lines.join("\r\n");
}
