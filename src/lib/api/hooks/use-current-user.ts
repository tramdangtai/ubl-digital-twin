"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { UserProfile, UserRole } from "@/lib/types/entities";

import { apiClient } from "../client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiClient.get<UserProfile>("/api/me"),
    retry: false,
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
