import { asc, eq } from "drizzle-orm";

import { AppError, ConflictError, NotFoundError } from "../api/errors";
import { db } from "../db/client";
import { userProfile } from "../db/schema";
import { createAdminClient } from "../supabase/admin";
import type { CreateUserInput, UpdateUserInput } from "../validation/user-profile";
import { assertNotStale } from "./concurrency";

export async function listUsers(includeArchived = false) {
  return db
    .select()
    .from(userProfile)
    .where(includeArchived ? undefined : eq(userProfile.status, "Active"))
    .orderBy(asc(userProfile.email));
}

export async function getUserProfile(userId: string) {
  const [row] = await db.select().from(userProfile).where(eq(userProfile.userId, userId));
  if (!row) throw new NotFoundError("User");
  return row;
}

/**
 * Admin tạo user mới: dùng Supabase Admin API tạo tài khoản Auth với mật khẩu
 * tạm (Admin tự đặt, gửi cho người dùng qua kênh khác — email_confirm: true
 * nên không phụ thuộc cấu hình SMTP của Supabase project), sau đó insert
 * profile với role đã chọn. Nếu insert profile thất bại sau khi tạo Auth user
 * thành công, xoá lại Auth user để tránh để lại tài khoản "mồ côi" không có
 * role — coi 2 bước này như 1 giao dịch logic dù không phải DB transaction
 * thật (2 hệ thống khác nhau: Supabase Auth + Postgres của app).
 */
export async function createUser(input: CreateUserInput) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (error || !data.user) {
    if (error?.code === "email_exists") {
      throw new ConflictError("Email này đã có tài khoản.", "DUPLICATE_VALUE");
    }
    throw new AppError(error?.message ?? "Không thể tạo tài khoản.", 500, "AUTH_CREATE_FAILED");
  }

  try {
    const [row] = await db
      .insert(userProfile)
      .values({
        userId: data.user.id,
        email: input.email,
        fullName: input.fullName,
        role: input.role,
      })
      .returning();
    return row;
  } catch (err) {
    await adminClient.auth.admin.deleteUser(data.user.id);
    throw err;
  }
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  const existing = await getUserProfile(userId);
  assertNotStale(input.expectedUpdatedAt, existing.updatedAt);

  // Archive/Reactivate profile đồng bộ với khoá/mở khoá đăng nhập ở Supabase
  // Auth — chỉ đổi status ở bảng profile là chưa đủ, user vẫn login được nếu
  // không ban ở tầng Auth (defense-in-depth, không chỉ dựa vào app-level check).
  if (input.status && input.status !== existing.status) {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: input.status === "Archived" ? "876000h" : "none",
    });
  }

  const [row] = await db
    .update(userProfile)
    .set({ role: input.role, status: input.status })
    .where(eq(userProfile.userId, userId))
    .returning();
  return row;
}
