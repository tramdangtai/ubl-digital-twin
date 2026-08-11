import type { NextRequest } from "next/server";

import { apiCreated, apiError, apiSuccess } from "@/lib/api/response";
import { createRetailer, listRetailers } from "@/lib/services/retailer.service";
import { createRetailerSchema } from "@/lib/validation/retailer";

export async function GET(request: NextRequest) {
  try {
    const includeArchived = request.nextUrl.searchParams.get("include_archived") === "true";
    const data = await listRetailers(includeArchived);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createRetailerSchema.parse(body);
    const data = await createRetailer(input);
    return apiCreated(data, "Retailer đã được tạo.");
  } catch (err) {
    return apiError(err);
  }
}
