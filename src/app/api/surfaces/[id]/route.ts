import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/response";
import { getSurface, updateSurface } from "@/lib/services/surface.service";
import { uuidSchema } from "@/lib/validation/common";
import { updateSurfaceSchema } from "@/lib/validation/surface";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const surfaceId = uuidSchema.parse(id);
    const data = await getSurface(surfaceId);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const surfaceId = uuidSchema.parse(id);
    const body = await request.json();
    const input = updateSurfaceSchema.parse(body);
    const data = await updateSurface(surfaceId, input);
    return apiSuccess(data, "Surface đã được cập nhật.");
  } catch (err) {
    return apiError(err);
  }
}
