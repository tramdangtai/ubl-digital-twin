import { ForbiddenError, UnauthenticatedError } from "@/lib/api/errors";

import { getCurrentUser, type CurrentUser } from "./session";

/**
 * Guard dùng ở đầu mỗi Route Handler — ném AppError, `apiError()` (đã có sẵn
 * từ Giai đoạn 1) tự dịch sang response envelope đúng status (401/403).
 * Middleware đã chặn phần lớn request chưa đăng nhập ở edge, nhưng vẫn giữ
 * check ở đây làm defense-in-depth + để lấy role phục vụ business logic.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

/** Admin/Editor được ghi dữ liệu; Viewer chỉ đọc (CLAUDE.md quyết định #1). */
export async function requireWriteAccess(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role === "Viewer") {
    throw new ForbiddenError("Viewer chỉ có quyền xem, không thể thực hiện thao tác này.");
  }
  return user;
}

/** Quản lý user (tạo/đổi role/khoá) — chỉ Admin. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "Admin") {
    throw new ForbiddenError("Chỉ Admin mới có quyền thực hiện thao tác này.");
  }
  return user;
}
