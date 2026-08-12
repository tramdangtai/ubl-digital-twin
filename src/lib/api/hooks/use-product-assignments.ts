"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AssignmentWithProduct, EntityStatus, ProductAssignment } from "@/lib/types/entities";

import { apiClient } from "../client";

export function useProductAssignments(positionId?: string) {
  return useQuery({
    queryKey: ["product-assignments", positionId],
    queryFn: () =>
      apiClient.get<ProductAssignment[]>(`/api/product-assignments?position_id=${positionId}`),
    enabled: Boolean(positionId),
  });
}

/**
 * Giai đoạn 8 A2: batch fetch toàn bộ Active Assignment + Product của 1 Surface.
 * Thay thế N+1 (useProductAssignments per-position) trong workspace.tsx.
 */
export function useSurfaceAssignments(surfaceId?: string) {
  return useQuery({
    queryKey: ["product-assignments", "by-surface", surfaceId],
    queryFn: () =>
      apiClient.get<AssignmentWithProduct[]>(
        `/api/product-assignments?surface_id=${surfaceId}`
      ),
    enabled: Boolean(surfaceId),
  });
}

export interface CreateProductAssignmentBody {
  positionId: string;
  productId: string;
  facingQty: number;
  displayOrder?: number;
  startDate?: string;
  endDate?: string;
}

export function useCreateProductAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductAssignmentBody) =>
      apiClient.post<ProductAssignment>("/api/product-assignments", input),
    onSuccess: () => {
      // Quan trọng — Giai đoạn 8 A2: invalidate theo PREFIX ["product-assignments"]
      // để cả key by-position lẫn key by-surface đều được làm mới.
      // Không dùng [positionId] cụ thể vì key by-surface sẽ bị bỏ sót.
      queryClient.invalidateQueries({ queryKey: ["product-assignments"] });
    },
  });
}

export type UpdateProductAssignmentBody = Partial<{
  facingQty: number;
  displayOrder: number;
  startDate: string | null;
  endDate: string | null;
  status: EntityStatus;
  expectedUpdatedAt: string;
}>;

export function useUpdateProductAssignment(assignmentId: string, positionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductAssignmentBody) =>
      apiClient.patch<ProductAssignment>(`/api/product-assignments/${assignmentId}`, input),
    onSuccess: () => {
      // Invalidate PREFIX để cả by-position lẫn by-surface đều tươi.
      queryClient.invalidateQueries({ queryKey: ["product-assignments"] });
      // Giữ positionId param (unused) để không phá signature đang có ở inspector.tsx.
      void positionId;
    },
  });
}
