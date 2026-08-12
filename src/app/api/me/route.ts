import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";

/** Trả thông tin user hiện tại (email/role) — dùng để hiện header + gating UI. */
export async function GET() {
  try {
    const user = await requireUser();
    return apiSuccess(user);
  } catch (err) {
    return apiError(err);
  }
}
