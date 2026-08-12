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
    return apiCreated(data, `Đã gán ${data.createdCount} Display Position.`);
  } catch (err) {
    return apiError(err);
  }
}
