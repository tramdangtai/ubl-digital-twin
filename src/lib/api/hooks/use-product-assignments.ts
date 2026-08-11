"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { EntityStatus, ProductAssignment } from "@/lib/types/entities";

import { apiClient } from "../client";

export function useProductAssignments(positionId?: string) {
  return useQuery({
    queryKey: ["product-assignments", positionId],
    queryFn: () =>
      apiClient.get<ProductAssignment[]>(`/api/product-assignments?position_id=${positionId}`),
    enabled: Boolean(positionId),
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["product-assignments", data.positionId] });
    },
  });
}

export type UpdateProductAssignmentBody = Partial<{
  facingQty: number;
  displayOrder: number;
  startDate: string | null;
  endDate: string | null;
  status: EntityStatus;
}>;

export function useUpdateProductAssignment(assignmentId: string, positionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductAssignmentBody) =>
      apiClient.patch<ProductAssignment>(`/api/product-assignments/${assignmentId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-assignments", positionId] });
    },
  });
}
