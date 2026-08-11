import type { NextRequest } from "next/server";

import { apiCreated, apiError, apiSuccess } from "@/lib/api/response";
import { createStore, listStores } from "@/lib/services/store.service";
import { uuidSchema } from "@/lib/validation/common";
import { createStoreSchema } from "@/lib/validation/store";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const retailerIdRaw = params.get("retailer_id");
    const retailerId = retailerIdRaw ? uuidSchema.parse(retailerIdRaw) : undefined;
    const includeArchived = params.get("include_archived") === "true";
    const data = await listStores(retailerId, includeArchived);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createStoreSchema.parse(body);
    const data = await createStore(input);
    return apiCreated(data, "Store đã được tạo.");
  } catch (err) {
    return apiError(err);
  }
}
