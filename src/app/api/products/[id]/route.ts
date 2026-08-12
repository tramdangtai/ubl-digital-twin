import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser, requireWriteAccess } from "@/lib/auth/guard";
import { getProduct, updateProduct } from "@/lib/services/product.service";
import { uuidSchema } from "@/lib/validation/common";
import { updateProductSchema } from "@/lib/validation/product";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const productId = uuidSchema.parse(id);
    const data = await getProduct(productId);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireWriteAccess();
    const { id } = await params;
    const productId = uuidSchema.parse(id);
    const body = await request.json();
    const input = updateProductSchema.parse(body);
    const data = await updateProduct(productId, input);
    return apiSuccess(data, "Product đã được cập nhật.");
  } catch (err) {
    return apiError(err);
  }
}
