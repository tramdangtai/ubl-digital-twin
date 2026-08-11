"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { EntityStatus, Product } from "@/lib/types/entities";

import { apiClient } from "../client";

export interface ProductListResult {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
}

export function useProducts(search: string) {
  return useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("page_size", "50");
      const res = await apiClient.getWithMeta<Product[]>(`/api/products?${params.toString()}`);
      return res;
    },
  });
}

export function useProduct(productId?: string) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: () => apiClient.get<Product>(`/api/products/${productId}`),
    enabled: Boolean(productId),
  });
}

export interface CreateProductBody {
  itemCode: string;
  description: string;
  category?: string;
  productGroup?: string;
  brand?: string;
  imageUrl?: string;
  widthMm?: number;
  heightMm?: number;
  depthMm?: number;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductBody) => apiClient.post<Product>("/api/products", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export type UpdateProductBody = Partial<{
  itemCode: string;
  description: string;
  category: string;
  productGroup: string;
  brand: string;
  imageUrl: string;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  status: EntityStatus;
  expectedUpdatedAt: string;
}>;

export function useUpdateProduct(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductBody) => apiClient.patch<Product>(`/api/products/${productId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
