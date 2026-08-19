import type { NextRequest } from "next/server";

import { apiCreated, apiError } from "@/lib/api/response";
import { requireWriteAccess } from "@/lib/auth/guard";
import { bulkCreateProductAssignments } from "@/lib/services/product-assignment.service";
import { bulkCreateProductAssignmentSchema } from "@/lib/validation/product-assignment";

export async function POST(request: NextRequest) {
  try {
    await requireWriteAccess();
    const body = await request.json();
    const input = bulkCreateProductAssignmentSchema.parse(body);
    const data = await bulkCreateProductAssignments(input);
    const msg =
      data.replacedCount > 0
        ? `Đã gán ${data.createdCount} Display Position (${data.replacedCount} ô thay sản phẩm cũ).`
        : `Đã gán ${data.createdCount} Display Position.`;
    return apiCreated(data, msg);
  } catch (err) {
    return apiError(err);
  }
}
