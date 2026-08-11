import { and, asc, eq } from "drizzle-orm";

import { AppError, NotFoundError, ValidationError } from "../api/errors";
import { db } from "../db/client";
import { displayPosition, surface } from "../db/schema";
import type {
  BulkGenerateDisplayPositionInput,
  CreateDisplayPositionInput,
  UpdateDisplayPositionInput,
} from "../validation/display-position";
import { archiveDisplayPositionSubtree } from "./cascade";

export async function listDisplayPositions(surfaceId: string, includeArchived = false) {
  return db
    .select()
    .from(displayPosition)
    .where(
      includeArchived
        ? eq(displayPosition.surfaceId, surfaceId)
        : and(eq(displayPosition.surfaceId, surfaceId), eq(displayPosition.status, "Active"))
    )
    .orderBy(asc(displayPosition.sortOrder), asc(displayPosition.createdAt));
}

export async function getDisplayPosition(positionId: string) {
  const [row] = await db
    .select()
    .from(displayPosition)
    .where(eq(displayPosition.positionId, positionId));
  if (!row) throw new NotFoundError("Display Position");
  return row;
}

export async function createDisplayPosition(input: CreateDisplayPositionInput) {
  const [parent] = await db
    .select({ status: surface.status })
    .from(surface)
    .where(eq(surface.surfaceId, input.surfaceId));
  if (!parent) throw new NotFoundError("Surface");
  if (parent.status !== "Active") {
    throw new AppError(
      "Không thể tạo Display Position dưới một Surface đã Archived.",
      422,
      "PARENT_NOT_ACTIVE"
    );
  }

  const [row] = await db
    .insert(displayPosition)
    .values({
      surfaceId: input.surfaceId,
      displayType: input.displayType,
      x: input.x,
      y: input.y,
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      capacity: input.capacity,
      facingLimit: input.facingLimit,
      sortOrder: input.sortOrder,
    })
    .returning();
  return row;
}

export async function updateDisplayPosition(positionId: string, input: UpdateDisplayPositionInput) {
  await getDisplayPosition(positionId);

  if (input.status === "Archived") {
    return db.transaction(async (tx) => {
      const hasOtherFields = Object.keys(input).some((key) => key !== "status");
      if (hasOtherFields) {
        await tx.update(displayPosition).set(input).where(eq(displayPosition.positionId, positionId));
      }
      await archiveDisplayPositionSubtree(tx, positionId);
      const [row] = await tx
        .select()
        .from(displayPosition)
        .where(eq(displayPosition.positionId, positionId));
      return row;
    });
  }

  const [row] = await db
    .update(displayPosition)
    .set(input)
    .where(eq(displayPosition.positionId, positionId))
    .returning();
  return row;
}

/**
 * Sinh N Display Position theo lưới rows x columns trong 1 Surface — Giai
 * đoạn 3, xem CLAUDE.md "Bổ sung scope Phase 1". Vẫn qua transaction 1 lần
 * (Part 02 §5 tinh thần) thay vì N request riêng lẻ.
 */
export async function bulkGenerateDisplayPositions(input: BulkGenerateDisplayPositionInput) {
  const [parentSurface] = await db
    .select({ status: surface.status, widthMm: surface.widthMm, heightMm: surface.heightMm })
    .from(surface)
    .where(eq(surface.surfaceId, input.surfaceId));
  if (!parentSurface) throw new NotFoundError("Surface");
  if (parentSurface.status !== "Active") {
    throw new AppError(
      "Không thể tạo Display Position dưới một Surface đã Archived.",
      422,
      "PARENT_NOT_ACTIVE"
    );
  }

  const totalWidth = input.columns * input.cellWidthMm + (input.columns - 1) * input.gapXMm;
  const totalHeight = input.rows * input.cellHeightMm + (input.rows - 1) * input.gapYMm;
  const gridRight = input.startX + totalWidth;
  const gridBottom = input.startY + totalHeight;

  if (gridRight > parentSurface.widthMm || gridBottom > parentSurface.heightMm) {
    throw new ValidationError(
      [
        {
          field: "columns",
          code: "GRID_EXCEEDS_SURFACE",
          message: `Lưới (${gridRight.toFixed(0)} x ${gridBottom.toFixed(
            0
          )} mm) vượt quá kích thước Surface (${parentSurface.widthMm} x ${parentSurface.heightMm} mm).`,
        },
      ],
      "Lưới vượt quá kích thước Surface."
    );
  }

  const rowsToInsert = [];
  let sortOrder = 0;
  for (let row = 0; row < input.rows; row++) {
    for (let col = 0; col < input.columns; col++) {
      rowsToInsert.push({
        surfaceId: input.surfaceId,
        displayType: input.displayType,
        x: input.startX + col * (input.cellWidthMm + input.gapXMm),
        y: input.startY + row * (input.cellHeightMm + input.gapYMm),
        widthMm: input.cellWidthMm,
        heightMm: input.cellHeightMm,
        capacity: input.capacity,
        facingLimit: input.facingLimit,
        sortOrder: sortOrder++,
      });
    }
  }

  return db.insert(displayPosition).values(rowsToInsert).returning();
}
