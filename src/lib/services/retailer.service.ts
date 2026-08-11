import { desc, eq } from "drizzle-orm";

import { NotFoundError } from "../api/errors";
import { db } from "../db/client";
import { retailer } from "../db/schema";
import type { CreateRetailerInput, UpdateRetailerInput } from "../validation/retailer";
import { archiveRetailerSubtree } from "./cascade";
import { assertNotStale } from "./concurrency";

export async function listRetailers(includeArchived = false) {
  return db
    .select()
    .from(retailer)
    .where(includeArchived ? undefined : eq(retailer.status, "Active"))
    .orderBy(desc(retailer.createdAt));
}

export async function getRetailer(retailerId: string) {
  const [row] = await db.select().from(retailer).where(eq(retailer.retailerId, retailerId));
  if (!row) throw new NotFoundError("Retailer");
  return row;
}

export async function createRetailer(input: CreateRetailerInput) {
  const [row] = await db
    .insert(retailer)
    .values({ retailerCode: input.retailerCode, retailerName: input.retailerName })
    .returning();
  return row;
}

export async function updateRetailer(retailerId: string, input: UpdateRetailerInput) {
  const existing = await getRetailer(retailerId);
  assertNotStale(input.expectedUpdatedAt, existing.updatedAt);

  if (input.status === "Archived") {
    return db.transaction(async (tx) => {
      if (input.retailerCode !== undefined || input.retailerName !== undefined) {
        await tx
          .update(retailer)
          .set({ retailerCode: input.retailerCode, retailerName: input.retailerName })
          .where(eq(retailer.retailerId, retailerId));
      }
      await archiveRetailerSubtree(tx, retailerId);
      const [row] = await tx.select().from(retailer).where(eq(retailer.retailerId, retailerId));
      return row;
    });
  }

  const [row] = await db
    .update(retailer)
    .set({
      retailerCode: input.retailerCode,
      retailerName: input.retailerName,
      status: input.status,
    })
    .where(eq(retailer.retailerId, retailerId))
    .returning();
  return row;
}
