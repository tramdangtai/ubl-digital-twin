"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { EntityStatus, Retailer } from "@/lib/types/entities";

import { apiClient } from "../client";

export function useRetailers() {
  return useQuery({
    queryKey: ["retailers"],
    queryFn: () => apiClient.get<Retailer[]>("/api/retailers"),
  });
}

export function useCreateRetailer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { retailerCode: string; retailerName: string }) =>
      apiClient.post<Retailer>("/api/retailers", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["retailers"] }),
  });
}

export function useUpdateRetailer(retailerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Partial<{ retailerCode: string; retailerName: string; status: EntityStatus }>
    ) => apiClient.patch<Retailer>(`/api/retailers/${retailerId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retailers"] });
      // Archive cascade có thể ảnh hưởng Store bên dưới.
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}
