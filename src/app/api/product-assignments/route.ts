import type { NextRequest } from "next/server";

import { apiCreated, apiError, apiSuccess } from "@/lib/api/response";
import { requireUser, requireWriteAccess } from "@/lib/auth/guard";
import {
  createProductAssignment,
  listProductAssignments,
} from "@/lib/services/product-assignment.service";
import { uuidSchema } from "@/lib/validation/common";
import { createProductAssignmentSchema } from "@/lib/validation/product-assignment";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const params = request.nextUrl.searchParams;
    const positionId = uuidSchema.parse(params.get("position_id"));
    const includeArchived = params.get("include_archived") === "true";
    const data = await listProductAssignments(positionId, includeArchived);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireWriteAccess();
    const body = await request.json();
    const input = createProductAssignmentSchema.parse(body);
    const data = await createProductAssignment(input);
    return apiCreated(data, "Product Assignment đã được tạo.");
  } catch (err) {
    return apiError(err);
  }
}
