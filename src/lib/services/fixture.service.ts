import { and, desc, eq } from "drizzle-orm";

import { AppError, NotFoundError } from "../api/errors";
import { db } from "../db/client";
import { fixture, store, surface } from "../db/schema";
import type { CreateFixtureInput, UpdateFixtureInput } from "../validation/fixture";
import { archiveFixtureSubtree } from "./cascade";

export async function listFixtures(storeId: string, includeArchived = false) {
  return db
    .select()
    .from(fixture)
    .where(
      includeArchived
        ? eq(fixture.storeId, storeId)
        : and(eq(fixture.storeId, storeId), eq(fixture.status, "Active"))
    )
    .orderBy(desc(fixture.createdAt));
}

export async function getFixture(fixtureId: string) {
  const [row] = await db.select().from(fixture).where(eq(fixture.fixtureId, fixtureId));
  if (!row) throw new NotFoundError("Fixture");
  return row;
}

export async function createFixture(input: CreateFixtureInput) {
  // Resource Existence Rule (Part 08 §4) + nhất quán với quyết định #5:
  // không tạo Active child dưới Archived parent.
  const [parent] = await db
    .select({ status: store.status })
    .from(store)
    .where(eq(store.storeId, input.storeId));
  if (!parent) throw new NotFoundError("Store");
  if (parent.status !== "Active") {
    throw new AppError("Không thể tạo Fixture dưới một Store đã Archived.", 422, "PARENT_NOT_ACTIVE");
  }

  // Part 02 §5 / TD-05 §12.2: Fixture + Surface bắt buộc phải cùng 1 transaction —
  // không được có trạng thái Fixture tồn tại nhưng Surface bắt buộc thì chưa.
  return db.transaction(async (tx) => {
    const [createdFixture] = await tx
      .insert(fixture)
      .values({
        storeId: input.storeId,
        fixtureCode: input.fixtureCode,
        fixtureName: input.fixtureName,
        ownerCompany: input.ownerCompany,
        fixtureType: input.fixtureType,
        widthMm: input.widthMm,
        heightMm: input.heightMm,
        depthMm: input.depthMm,
        positionX: input.positionX,
        positionY: input.positionY,
        rotationDegree: input.rotationDegree,
      })
      .returning();

    // Quyết định implement Giai đoạn 2 (chưa có trong Foundation gốc — ghi rõ
    // trong CLAUDE.md): mỗi Fixture mới tự động có 1 Surface "Front" cùng kích
    // thước mặt trước. Back/Left/Right/Top tạo thủ công ở Giai đoạn 3.
    await tx.insert(surface).values({
      fixtureId: createdFixture.fixtureId,
      surfaceName: "Front",
      orientation: "Front",
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      sortOrder: 0,
    });

    return createdFixture;
  });
}

export async function updateFixture(fixtureId: string, input: UpdateFixtureInput) {
  await getFixture(fixtureId);

  if (input.status === "Archived") {
    return db.transaction(async (tx) => {
      const hasOtherFields = Object.keys(input).some((key) => key !== "status");
      if (hasOtherFields) {
        await tx.update(fixture).set(input).where(eq(fixture.fixtureId, fixtureId));
      }
      await archiveFixtureSubtree(tx, fixtureId);
      const [row] = await tx.select().from(fixture).where(eq(fixture.fixtureId, fixtureId));
      return row;
    });
  }

  const [row] = await db
    .update(fixture)
    .set(input)
    .where(eq(fixture.fixtureId, fixtureId))
    .returning();
  return row;
}
