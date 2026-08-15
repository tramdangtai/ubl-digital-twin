"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { UserProfile, UserRole } from "@/lib/types/entities";

import { apiClient, ApiRequestError } from "../client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiClient.get<UserProfile>("/api/me"),
    /**
     * Trước đây `retry: false` khiến một lỗi 500 thoáng qua (mất mạng, DB chớp
     * tắt) làm `me` hỏng vĩnh viễn cả phiên → `canWrite()` trả false → toàn bộ
     * nút tạo/sửa biến mất và user tưởng bị mất quyền.
     *
     * 401/403 là câu trả lời dứt khoát của máy chủ, thử lại vô nghĩa. Còn lỗi
     * 5xx/mạng thì đáng thử lại vài lần.
     */
    retry: (failureCount, error) => {
      const status = error instanceof ApiRequestError ? error.status : 0;
      if (status === 401 || status === 403) return false;
      return failureCount < 3;
    },
    staleTime: 60_000,
  });
}

/** true cho Admin/Editor — dùng để ẩn/disable action button ở Viewer (UX only, backend luôn tự validate lại). */
export function canWrite(role: UserRole | undefined): boolean {
  return role === "Admin" || role === "Editor";
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    queryClient.clear();
    window.location.href = "/login";
  };
}
