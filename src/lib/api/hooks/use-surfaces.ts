"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { EntityStatus, Surface, SurfaceOrientation } from "@/lib/types/entities";

import { apiClient } from "../client";

export function useSurfaces(fixtureId?: string) {
  return useQuery({
    queryKey: ["surfaces", fixtureId],
    queryFn: () => apiClient.get<Surface[]>(`/api/surfaces?fixture_id=${fixtureId}`),
    enabled: Boolean(fixtureId),
  });
}

export interface CreateSurfaceBody {
  fixtureId: string;
  surfaceName?: string;
  orientation: SurfaceOrientation;
  widthMm: number;
  heightMm: number;
  sortOrder?: number;
}

export function useCreateSurface() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSurfaceBody) => apiClient.post<Surface>("/api/surfaces", input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["surfaces", data.fixtureId] });
    },
  });
}

export type UpdateSurfaceBody = Partial<{
  surfaceName: string;
  widthMm: number;
  heightMm: number;
  sortOrder: number;
  status: EntityStatus;
}>;

export function useUpdateSurface(surfaceId: string, fixtureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSurfaceBody) => apiClient.patch<Surface>(`/api/surfaces/${surfaceId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surfaces", fixtureId] });
      // Archive cascade có thể ảnh hưởng Display Position bên dưới.
      queryClient.invalidateQueries({ queryKey: ["display-positions"] });
    },
  });
}
