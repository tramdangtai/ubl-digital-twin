import { and, asc, eq } from "drizzle-orm";

import { AppError, NotFoundError } from "../api/errors";
import { db } from "../db/client";
import { backgroundImage, fixture, surface } from "../db/schema";
import type { CreateSurfaceInput, UpdateSurfaceInput } from "../validation/surface";
import { archiveSurfaceSubtree } from "./cascade";
import { assertNotStale } from "./concurrency";

export async function listSurfaces(fixtureId: string, includeArchived = false) {
  return db
    .select()
    .from(surface)
    .where(
      includeArchived
        ? eq(surface.fixtureId, fixtureId)
        : and(eq(surface.fixtureId, fixtureId), eq(surface.status, "Active"))
    )
    .orderBy(asc(surface.sortOrder), asc(surface.createdAt));
}

export async function getSurface(surfaceId: string) {
  const [row] = await db.select().from(surface).where(eq(surface.surfaceId, surfaceId));
  if (!row) throw new NotFoundError("Surface");
  return row;
}

export async function createSurface(input: CreateSurfaceInput) {
  const [parent] = await db
    .select({ status: fixture.status })
    .from(fixture)
    .where(eq(fixture.fixtureId, input.fixtureId));
  if (!parent) throw new NotFoundError("Fixture");
  if (parent.status !== "Active") {
    throw new AppError("Không thể tạo Surface dưới một Fixture đã Archived.", 422, "PARENT_NOT_ACTIVE");
  }

  const [row] = await db
    .insert(surface)
    .values({
      fixtureId: input.fixtureId,
      surfaceName: input.surfaceName,
      orientation: input.orientation,
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      sortOrder: input.sortOrder,
    })
    .returning();
  return row;
}

export async function updateSurface(surfaceId: string, input: UpdateSurfaceInput) {
  const existing = await getSurface(surfaceId);
  const { expectedUpdatedAt, ...fields } = input;
  assertNotStale(expectedUpdatedAt, existing.updatedAt);

  // Giai đoạn 9: nếu gán backgroundImageId, kiểm tra ảnh phải Active.
  if (fields.backgroundImageId !== undefined && fields.backgroundImageId !== null) {
    const [img] = await db
      .select({ status: backgroundImage.status })
      .from(backgroundImage)
      .where(eq(backgroundImage.backgroundImageId, fields.backgroundImageId));
    if (!img) throw new NotFoundError("Background Image");
    if (img.status !== "Active") {
      throw new AppError("Background Image đã Archived, không thể gán.", 422, "PARENT_NOT_ACTIVE");
    }
  }

  if (fields.status === "Archived") {
    return db.transaction(async (tx) => {
      const hasOtherFields = Object.keys(fields).some((key) => key !== "status");
      if (hasOtherFields) {
        await tx.update(surface).set(fields).where(eq(surface.surfaceId, surfaceId));
      }
      await archiveSurfaceSubtree(tx, surfaceId);
      const [row] = await tx.select().from(surface).where(eq(surface.surfaceId, surfaceId));
      return row;
    });
  }

  const [row] = await db
    .update(surface)
    .set(fields)
    .where(eq(surface.surfaceId, surfaceId))
    .returning();
  return row;
}
