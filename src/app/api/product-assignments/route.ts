import type { NextRequest } from "next/server";

import { apiCreated, apiError, apiSuccess } from "@/lib/api/response";
import { requireUser, requireWriteAccess } from "@/lib/auth/guard";
import {
  createProductAssignment,
  listActiveAssignmentsBySurface,
  listProductAssignments,
} from "@/lib/services/product-assignment.service";
import { ValidationError } from "@/lib/api/errors";
import { uuidSchema } from "@/lib/validation/common";
import { createProductAssignmentSchema } from "@/lib/validation/product-assignment";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const params = request.nextUrl.searchParams;
    const positionId = params.get("position_id");
    const surfaceId = params.get("surface_id");

    if (!positionId && !surfaceId) {
      throw new ValidationError(
        [{ field: "query", code: "MISSING_PARAM", message: "Phải có position_id hoặc surface_id." }],
        "Thiếu tham số bắt buộc."
      );
    }

    if (surfaceId) {
      // Giai đoạn 8 A2: batch query theo Surface — 1 request thay vì N+1.
      const validSurfaceId = uuidSchema.parse(surfaceId);
      const data = await listActiveAssignmentsBySurface(validSurfaceId);
      return apiSuccess(data);
    }

    // Giữ nguyên hành vi position_id cũ.
    const validPositionId = uuidSchema.parse(positionId);
    const includeArchived = params.get("include_archived") === "true";
    const data = await listProductAssignments(validPositionId, includeArchived);
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
