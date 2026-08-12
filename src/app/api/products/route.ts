import type { NextRequest } from "next/server";

import { apiCreated, apiError, apiSuccessPaginated } from "@/lib/api/response";
import { requireUser, requireWriteAccess } from "@/lib/auth/guard";
import { createProduct, listProducts } from "@/lib/services/product.service";
import { createProductSchema, listProductsQuerySchema } from "@/lib/validation/product";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const params = request.nextUrl.searchParams;
    const query = listProductsQuerySchema.parse({
      search: params.get("search") ?? undefined,
      page: params.get("page") ?? undefined,
      pageSize: params.get("page_size") ?? undefined,
      includeArchived: params.get("include_archived") ?? undefined,
    });
    const result = await listProducts(query);
    return apiSuccessPaginated(result.items, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireWriteAccess();
    const body = await request.json();
    const input = createProductSchema.parse(body);
    const data = await createProduct(input);
    return apiCreated(data, "Product đã được tạo.");
  } catch (err) {
    return apiError(err);
  }
}
