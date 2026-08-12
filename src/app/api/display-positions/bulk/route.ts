import type { NextRequest } from "next/server";

import { apiCreated, apiError } from "@/lib/api/response";
import { requireWriteAccess } from "@/lib/auth/guard";
import { bulkGenerateDisplayPositions } from "@/lib/services/display-position.service";
import { bulkGenerateDisplayPositionSchema } from "@/lib/validation/display-position";

export async function POST(request: NextRequest) {
  try {
    await requireWriteAccess();
    const body = await request.json();
    const input = bulkGenerateDisplayPositionSchema.parse(body);
    const data = await bulkGenerateDisplayPositions(input);
    return apiCreated(data, `Đã tạo ${data.length} Display Position.`);
  } catch (err) {
    return apiError(err);
  }
}
