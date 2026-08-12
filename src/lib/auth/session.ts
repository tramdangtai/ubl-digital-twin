import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { userProfile } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

import type { UserRole } from "../validation/user-profile";

export interface CurrentUser {
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  status: "Active" | "Archived";
}

/**
 * Đọc session Supabase Auth (server-side) rồi tra `user_profile` để lấy role.
 * Trả về `null` khi: chưa đăng nhập, hoặc đã đăng nhập nhưng chưa được Admin
 * cấp profile/role (tài khoản Supabase Auth tồn tại độc lập với việc có được
 * cấp quyền dùng app hay không), hoặc profile đã bị Archived (khoá quyền).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db.select().from(userProfile).where(eq(userProfile.userId, user.id));
  if (!profile || profile.status !== "Active") return null;

  return {
    userId: profile.userId,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role as UserRole,
    status: profile.status as "Active" | "Archived",
  };
}
