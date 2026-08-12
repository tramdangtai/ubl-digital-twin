import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser, requireWriteAccess } from "@/lib/auth/guard";
import {
  getProductAssignment,
  updateProductAssignment,
} from "@/lib/services/product-assignment.service";
import { uuidSchema } from "@/lib/validation/common";
import { updateProductAssignmentSchema } from "@/lib/validation/product-assignment";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const assignmentId = uuidSchema.parse(id);
    const data = await getProductAssignment(assignmentId);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireWriteAccess();
    const { id } = await params;
    const assignmentId = uuidSchema.parse(id);
    const body = await request.json();
    const input = updateProductAssignmentSchema.parse(body);
    const data = await updateProductAssignment(assignmentId, input);
    return apiSuccess(data, "Product Assignment đã được cập nhật.");
  } catch (err) {
    return apiError(err);
  }
}
