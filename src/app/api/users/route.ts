import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/guard";

import { apiCreated, apiError, apiSuccess } from "@/lib/api/response";
import { createUser, listUsers } from "@/lib/services/user.service";
import { createUserSchema } from "@/lib/validation/user-profile";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const includeArchived = request.nextUrl.searchParams.get("include_archived") === "true";
    const data = await listUsers(includeArchived);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const input = createUserSchema.parse(body);
    const data = await createUser(input);
    return apiCreated(data, "Tài khoản đã được tạo.");
  } catch (err) {
    return apiError(err);
  }
}
