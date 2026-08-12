import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/guard";

import { apiError, apiSuccess } from "@/lib/api/response";
import { getUserProfile, updateUser } from "@/lib/services/user.service";
import { uuidSchema } from "@/lib/validation/common";
import { updateUserSchema } from "@/lib/validation/user-profile";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const userId = uuidSchema.parse(id);
    const data = await getUserProfile(userId);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const userId = uuidSchema.parse(id);
    const body = await request.json();
    const input = updateUserSchema.parse(body);
    const data = await updateUser(userId, input);
    return apiSuccess(data, "Đã cập nhật tài khoản.");
  } catch (err) {
    return apiError(err);
  }
}
