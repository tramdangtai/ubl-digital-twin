"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { UserProfile, UserRole } from "@/lib/types/entities";

import { apiClient } from "../client";

export function useUsers(includeArchived = false) {
  return useQuery({
    queryKey: ["users", includeArchived],
    queryFn: () =>
      apiClient.get<UserProfile[]>(`/api/users?include_archived=${includeArchived}`),
  });
}

export interface CreateUserBody {
  email: string;
  password: string;
  fullName?: string;
  role: UserRole;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserBody) => apiClient.post<UserProfile>("/api/users", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export type UpdateUserBody = Partial<{
  role: UserRole;
  status: "Active" | "Archived";
  expectedUpdatedAt: string;
}>;

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserBody) => apiClient.patch<UserProfile>(`/api/users/${userId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
