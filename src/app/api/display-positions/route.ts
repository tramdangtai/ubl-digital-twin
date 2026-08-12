import type { NextRequest } from "next/server";

import { apiCreated, apiError, apiSuccess } from "@/lib/api/response";
import { requireUser, requireWriteAccess } from "@/lib/auth/guard";
import {
  createDisplayPosition,
  listDisplayPositions,
} from "@/lib/services/display-position.service";
import { uuidSchema } from "@/lib/validation/common";
import { createDisplayPositionSchema } from "@/lib/validation/display-position";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const params = request.nextUrl.searchParams;
    const surfaceId = uuidSchema.parse(params.get("surface_id"));
    const includeArchived = params.get("include_archived") === "true";
    const data = await listDisplayPositions(surfaceId, includeArchived);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireWriteAccess();
    const body = await request.json();
    const input = createDisplayPositionSchema.parse(body);
    const data = await createDisplayPosition(input);
    return apiCreated(data, "Display Position đã được tạo.");
  } catch (err) {
    return apiError(err);
  }
}
