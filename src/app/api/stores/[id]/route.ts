import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser, requireWriteAccess } from "@/lib/auth/guard";
import { getStore, updateStore } from "@/lib/services/store.service";
import { uuidSchema } from "@/lib/validation/common";
import { updateStoreSchema } from "@/lib/validation/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const storeId = uuidSchema.parse(id);
    const data = await getStore(storeId);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireWriteAccess();
    const { id } = await params;
    const storeId = uuidSchema.parse(id);
    const body = await request.json();
    const input = updateStoreSchema.parse(body);
    const data = await updateStore(storeId, input);
    return apiSuccess(data, "Store đã được cập nhật.");
  } catch (err) {
    return apiError(err);
  }
}
