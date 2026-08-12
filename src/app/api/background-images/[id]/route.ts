import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/guard";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  countSurfacesUsing,
  updateBackgroundImage,
} from "@/lib/services/background-image.service";
import { updateBackgroundImageSchema } from "@/lib/validation/background-image";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const input = updateBackgroundImageSchema.parse(body);

    // Cảnh báo nếu đang archive ảnh đang được dùng, nhưng KHÔNG chặn (quyết định
    // implement: admin biết mình đang làm gì; Surface sẽ mất ảnh nền sau khi ảnh Archive).
    let warningMessage = "";
    if (input.status === "Archived") {
      const usedBy = await countSurfacesUsing(id);
      if (usedBy > 0) {
        warningMessage = `Cảnh báo: ảnh này đang được dùng bởi ${usedBy} Surface. Sau khi Archive, các Surface đó sẽ không còn hiện ảnh nền.`;
      }
    }

    const data = await updateBackgroundImage(id, input);
    return apiSuccess(data, warningMessage || "Cập nhật thành công.");
  } catch (err) {
    return apiError(err);
  }
}
