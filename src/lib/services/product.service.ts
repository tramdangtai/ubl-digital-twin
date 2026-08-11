import { and, asc, count, eq, ilike, or } from "drizzle-orm";

import { NotFoundError } from "../api/errors";
import { db } from "../db/client";
import { product } from "../db/schema";
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from "../validation/product";

export async function listProducts(query: ListProductsQuery) {
  const conditions = [];
  if (!query.includeArchived) conditions.push(eq(product.status, "Active"));
  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(
      or(
        ilike(product.itemCode, term),
        ilike(product.description, term),
        ilike(product.category, term),
        ilike(product.productGroup, term),
        ilike(product.brand, term)
      )
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(product)
      .where(where)
      .orderBy(asc(product.itemCode))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: count() }).from(product).where(where),
  ]);

  return {
    items: rows,
    page: query.page,
    pageSize: query.pageSize,
    total: Number(totalResult[0]?.total ?? 0),
  };
}

export async function getProduct(productId: string) {
  const [row] = await db.select().from(product).where(eq(product.productId, productId));
  if (!row) throw new NotFoundError("Product");
  return row;
}

export async function createProduct(input: CreateProductInput) {
  const [row] = await db
    .insert(product)
    .values({
      itemCode: input.itemCode,
      description: input.description,
      category: input.category,
      productGroup: input.productGroup,
      brand: input.brand,
      imageUrl: input.imageUrl,
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      depthMm: input.depthMm,
    })
    .returning();
  return row;
}

/**
 * Product không có subtree để cascade (Part 02 §3.6 — độc lập với Store/
 * Fixture). Archive Product KHÔNG tự động archive Product Assignment đang
 * tham chiếu nó — chỉ chặn việc tạo Assignment MỚI cho Product đã Archived
 * (xem product-assignment.service.ts). Đây là implement decision vì
 * Foundation không nói rõ, ghi lại ở CLAUDE.md.
 */
export async function updateProduct(productId: string, input: UpdateProductInput) {
  await getProduct(productId);

  const [row] = await db
    .update(product)
    .set(input)
    .where(eq(product.productId, productId))
    .returning();
  return row;
}
