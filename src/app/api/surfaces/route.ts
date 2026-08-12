import type { NextRequest } from "next/server";

import { apiCreated, apiError, apiSuccess } from "@/lib/api/response";
import { requireUser, requireWriteAccess } from "@/lib/auth/guard";
import { createSurface, listSurfaces } from "@/lib/services/surface.service";
import { uuidSchema } from "@/lib/validation/common";
import { createSurfaceSchema } from "@/lib/validation/surface";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const params = request.nextUrl.searchParams;
    const fixtureId = uuidSchema.parse(params.get("fixture_id"));
    const includeArchived = params.get("include_archived") === "true";
    const data = await listSurfaces(fixtureId, includeArchived);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireWriteAccess();
    const body = await request.json();
    const input = createSurfaceSchema.parse(body);
    const data = await createSurface(input);
    return apiCreated(data, "Surface đã được tạo.");
  } catch (err) {
    return apiError(err);
  }
}
