import { and, desc, eq } from "drizzle-orm";

import { AppError, NotFoundError } from "../api/errors";
import { db } from "../db/client";
import { retailer, store } from "../db/schema";
import type { CreateStoreInput, UpdateStoreInput } from "../validation/store";
import { archiveStoreSubtree } from "./cascade";

export async function listStores(retailerId?: string, includeArchived = false) {
  const conditions = [];
  if (retailerId) conditions.push(eq(store.retailerId, retailerId));
  if (!includeArchived) conditions.push(eq(store.status, "Active"));

  return db
    .select()
    .from(store)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(store.createdAt));
}

export async function getStore(storeId: string) {
  const [row] = await db.select().from(store).where(eq(store.storeId, storeId));
  if (!row) throw new NotFoundError("Store");
  return row;
}

export async function createStore(input: CreateStoreInput) {
  // Resource Existence Rule (Part 08 §4): Retailer phải tồn tại.
  // Quyết định nghiệp vụ (CLAUDE.md, mở rộng #5): không tạo Active child mới
  // dưới một Archived parent — nhất quán với việc Archive Store sẽ cascade
  // xuống toàn bộ subtree.
  const [parent] = await db
    .select({ status: retailer.status })
    .from(retailer)
    .where(eq(retailer.retailerId, input.retailerId));
  if (!parent) throw new NotFoundError("Retailer");
  if (parent.status !== "Active") {
    throw new AppError("Không thể tạo Store dưới một Retailer đã Archived.", 422, "PARENT_NOT_ACTIVE");
  }

  const [row] = await db
    .insert(store)
    .values({
      retailerId: input.retailerId,
      storeCode: input.storeCode,
      storeName: input.storeName,
      address: input.address,
    })
    .returning();
  return row;
}

export async function updateStore(storeId: string, input: UpdateStoreInput) {
  await getStore(storeId);

  if (input.status === "Archived") {
    return db.transaction(async (tx) => {
      if (
        input.storeCode !== undefined ||
        input.storeName !== undefined ||
        input.address !== undefined
      ) {
        await tx
          .update(store)
          .set({ storeCode: input.storeCode, storeName: input.storeName, address: input.address })
          .where(eq(store.storeId, storeId));
      }
      await archiveStoreSubtree(tx, storeId);
      const [row] = await tx.select().from(store).where(eq(store.storeId, storeId));
      return row;
    });
  }

  const [row] = await db
    .update(store)
    .set({
      storeCode: input.storeCode,
      storeName: input.storeName,
      address: input.address,
      status: input.status,
    })
    .where(eq(store.storeId, storeId))
    .returning();
  return row;
}
