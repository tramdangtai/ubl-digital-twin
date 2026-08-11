"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { EntityStatus, Store } from "@/lib/types/entities";

import { apiClient } from "../client";

export function useStores(retailerId?: string) {
  return useQuery({
    queryKey: ["stores", retailerId ?? "all"],
    queryFn: () =>
      apiClient.get<Store[]>(
        retailerId ? `/api/stores?retailer_id=${retailerId}` : "/api/stores"
      ),
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      retailerId: string;
      storeCode: string;
      storeName: string;
      address?: string;
    }) => apiClient.post<Store>("/api/stores", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stores"] }),
  });
}

export function useUpdateStore(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Partial<{
        storeCode: string;
        storeName: string;
        address: string;
        status: EntityStatus;
        expectedUpdatedAt: string;
      }>
    ) => apiClient.patch<Store>(`/api/stores/${storeId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stores"] }),
  });
}
