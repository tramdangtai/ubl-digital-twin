import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser, requireWriteAccess } from "@/lib/auth/guard";
import { getFixture, updateFixture } from "@/lib/services/fixture.service";
import { uuidSchema } from "@/lib/validation/common";
import { updateFixtureSchema } from "@/lib/validation/fixture";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const fixtureId = uuidSchema.parse(id);
    const data = await getFixture(fixtureId);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireWriteAccess();
    const { id } = await params;
    const fixtureId = uuidSchema.parse(id);
    const body = await request.json();
    const input = updateFixtureSchema.parse(body);
    const data = await updateFixture(fixtureId, input);
    return apiSuccess(data, "Fixture đã được cập nhật.");
  } catch (err) {
    return apiError(err);
  }
}
