import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser, requireWriteAccess } from "@/lib/auth/guard";
import { getRetailer, updateRetailer } from "@/lib/services/retailer.service";
import { uuidSchema } from "@/lib/validation/common";
import { updateRetailerSchema } from "@/lib/validation/retailer";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const retailerId = uuidSchema.parse(id);
    const data = await getRetailer(retailerId);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireWriteAccess();
    const { id } = await params;
    const retailerId = uuidSchema.parse(id);
    const body = await request.json();
    const input = updateRetailerSchema.parse(body);
    const data = await updateRetailer(retailerId, input);
    return apiSuccess(data, "Retailer đã được cập nhật.");
  } catch (err) {
    return apiError(err);
  }
}
