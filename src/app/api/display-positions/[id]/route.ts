import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser, requireWriteAccess } from "@/lib/auth/guard";
import {
  getDisplayPosition,
  updateDisplayPosition,
} from "@/lib/services/display-position.service";
import { uuidSchema } from "@/lib/validation/common";
import { updateDisplayPositionSchema } from "@/lib/validation/display-position";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const positionId = uuidSchema.parse(id);
    const data = await getDisplayPosition(positionId);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireWriteAccess();
    const { id } = await params;
    const positionId = uuidSchema.parse(id);
    const body = await request.json();
    const input = updateDisplayPositionSchema.parse(body);
    const data = await updateDisplayPosition(positionId, input);
    return apiSuccess(data, "Display Position đã được cập nhật.");
  } catch (err) {
    return apiError(err);
  }
}
