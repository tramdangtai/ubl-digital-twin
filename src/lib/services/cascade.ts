import { eq, inArray } from "drizzle-orm";

import { db } from "../db/client";
import { displayPosition, fixture, productAssignment, retailer, store, surface } from "../db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Archive toàn bộ subtree bên dưới một tập Display Position (Product
 * Assignment) rồi archive chính các Display Position đó.
 */
async function archiveDisplayPositionIdsSubtree(tx: Tx, positionIds: string[]) {
  if (positionIds.length === 0) return;

  await tx
    .update(productAssignment)
    .set({ status: "Archived" })
    .where(inArray(productAssignment.positionId, positionIds));

  await tx
    .update(displayPosition)
    .set({ status: "Archived" })
    .where(inArray(displayPosition.positionId, positionIds));
}

/**
 * Archive toàn bộ subtree bên dưới một tập Surface (Display Position →
 * Product Assignment) rồi archive chính các Surface đó.
 */
async function archiveSurfaceIdsSubtree(tx: Tx, surfaceIds: string[]) {
  if (surfaceIds.length === 0) return;

  const positions = await tx
    .select({ positionId: displayPosition.positionId })
    .from(displayPosition)
    .where(inArray(displayPosition.surfaceId, surfaceIds));

  await archiveDisplayPositionIdsSubtree(
    tx,
    positions.map((p) => p.positionId)
  );

  await tx.update(surface).set({ status: "Archived" }).where(inArray(surface.surfaceId, surfaceIds));
}

/**
 * Archive toàn bộ subtree bên dưới một tập Fixture (Surface → Display
 * Position → Product Assignment) rồi archive chính các Fixture đó.
 * Dùng chung cho archiveFixtureSubtree (1 fixture) và archiveStoreSubtree
 * (nhiều fixture cùng lúc) để không lặp lại logic 3 tầng.
 */
async function archiveFixtureIdsSubtree(tx: Tx, fixtureIds: string[]) {
  if (fixtureIds.length === 0) return;

  const surfaces = await tx
    .select({ surfaceId: surface.surfaceId })
    .from(surface)
    .where(inArray(surface.fixtureId, fixtureIds));

  await archiveSurfaceIdsSubtree(
    tx,
    surfaces.map((s) => s.surfaceId)
  );

  await tx.update(fixture).set({ status: "Archived" }).where(inArray(fixture.fixtureId, fixtureIds));
}

/**
 * Archive 1 Display Position + Product Assignment đang Active bên dưới nó.
 * Phải gọi bên trong transaction của caller.
 */
export async function archiveDisplayPositionSubtree(tx: Tx, positionId: string) {
  await archiveDisplayPositionIdsSubtree(tx, [positionId]);
}

/**
 * Archive 1 Surface + toàn bộ subtree (Display Position → Product
 * Assignment). Phải gọi bên trong transaction của caller.
 */
export async function archiveSurfaceSubtree(tx: Tx, surfaceId: string) {
  await archiveSurfaceIdsSubtree(tx, [surfaceId]);
}

/**
 * Archive 1 Fixture + toàn bộ subtree (Surface → Display Position →
 * Product Assignment). Cùng nguyên tắc cascade như Store/Retailer (CLAUDE.md
 * quyết định #5) áp dụng xuống 1 cấp thấp hơn.
 *
 * Phải gọi bên trong transaction của caller.
 */
export async function archiveFixtureSubtree(tx: Tx, fixtureId: string) {
  await archiveFixtureIdsSubtree(tx, [fixtureId]);
}

/**
 * Archive Store + toàn bộ subtree bên dưới (Fixture → Surface →
 * Display Position → Product Assignment).
 *
 * Quyết định nghiệp vụ CLAUDE.md #5: "Archive Store thì toàn bộ bên dưới nó
 * archive luôn." Ngược lại (Archived → Active) KHÔNG tự động phục hồi
 * subtree — restore từng entity phải làm thủ công, tránh vô tình "hồi sinh"
 * cả cây dữ liệu cũ.
 *
 * Phải được gọi bên trong transaction của caller (không tự mở transaction ở
 * đây) để gộp chung với việc archive Store/Retailer ở tầng gọi.
 */
export async function archiveStoreSubtree(tx: Tx, storeId: string) {
  const fixtures = await tx
    .select({ fixtureId: fixture.fixtureId })
    .from(fixture)
    .where(eq(fixture.storeId, storeId));

  await archiveFixtureIdsSubtree(
    tx,
    fixtures.map((f) => f.fixtureId)
  );

  await tx.update(store).set({ status: "Archived" }).where(eq(store.storeId, storeId));
}

/** Archive Retailer + toàn bộ Store (và subtree của từng Store) bên dưới. */
export async function archiveRetailerSubtree(tx: Tx, retailerId: string) {
  const stores = await tx
    .select({ storeId: store.storeId })
    .from(store)
    .where(eq(store.retailerId, retailerId));

  for (const s of stores) {
    await archiveStoreSubtree(tx, s.storeId);
  }

  await tx.update(retailer).set({ status: "Archived" }).where(eq(retailer.retailerId, retailerId));
}
