import type { NextRequest } from "next/server";

import { apiCreated, apiError, apiSuccess } from "@/lib/api/response";
import { createFixture, listFixtures } from "@/lib/services/fixture.service";
import { uuidSchema } from "@/lib/validation/common";
import { createFixtureSchema } from "@/lib/validation/fixture";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const storeId = uuidSchema.parse(params.get("store_id"));
    const includeArchived = params.get("include_archived") === "true";
    const data = await listFixtures(storeId, includeArchived);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createFixtureSchema.parse(body);
    const data = await createFixture(input);
    return apiCreated(data, "Fixture đã được tạo.");
  } catch (err) {
    return apiError(err);
  }
}
