"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BackgroundImage, EntityStatus } from "@/lib/types/entities";

import { apiClient } from "../client";

/** URL proxy để hiển thị ảnh nền (same-origin, yêu cầu đăng nhập). */
export function backgroundImageUrl(id: string): string {
  return `/api/background-images/${id}/file`;
}

export function useBackgroundImages(includeArchived = false) {
  return useQuery({
    queryKey: ["background-images", includeArchived],
    queryFn: () => {
      const params = new URLSearchParams();
      if (includeArchived) params.set("include_archived", "true");
      return apiClient.get<BackgroundImage[]>(`/api/background-images?${params.toString()}`);
    },
  });
}

export interface UploadBackgroundImageInput {
  file: File;
  label: string;
  widthPx?: number | null;
  heightPx?: number | null;
}

export function useUploadBackgroundImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, label, widthPx, heightPx }: UploadBackgroundImageInput) => {
      const form = new FormData();
      form.append("file", file);
      form.append("label", label);
      if (widthPx != null) form.append("width_px", String(widthPx));
      if (heightPx != null) form.append("height_px", String(heightPx));
      return apiClient.postForm<BackgroundImage>("/api/background-images", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["background-images"] });
    },
  });
}

export type UpdateBackgroundImageBody = Partial<{
  label: string;
  status: EntityStatus;
  expectedUpdatedAt: string;
}>;

export function useUpdateBackgroundImage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBackgroundImageBody) =>
      apiClient.patch<BackgroundImage>(`/api/background-images/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["background-images"] });
    },
  });
}
