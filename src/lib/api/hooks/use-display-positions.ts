"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DisplayPosition, DisplayType, EntityStatus } from "@/lib/types/entities";

import { apiClient } from "../client";

export function useDisplayPositions(surfaceId?: string) {
  return useQuery({
    queryKey: ["display-positions", surfaceId],
    queryFn: () => apiClient.get<DisplayPosition[]>(`/api/display-positions?surface_id=${surfaceId}`),
    enabled: Boolean(surfaceId),
  });
}

export interface CreateDisplayPositionBody {
  surfaceId: string;
  displayType: DisplayType;
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  capacity?: number;
  facingLimit?: number;
  sortOrder?: number;
}

export function useCreateDisplayPosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDisplayPositionBody) =>
      apiClient.post<DisplayPosition>("/api/display-positions", input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["display-positions", data.surfaceId] });
    },
  });
}

export type UpdateDisplayPositionBody = Partial<{
  displayType: DisplayType;
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  capacity: number | null;
  facingLimit: number | null;
  sortOrder: number;
  status: EntityStatus;
  expectedUpdatedAt: string;
}>;

export function useUpdateDisplayPosition(positionId: string, surfaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDisplayPositionBody) =>
      apiClient.patch<DisplayPosition>(`/api/display-positions/${positionId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["display-positions", surfaceId] });
    },
  });
}

export interface BulkGenerateDisplayPositionBody {
  surfaceId: string;
  displayType: DisplayType;
  rows: number;
  columns: number;
  startX: number;
  startY: number;
  cellWidthMm: number;
  cellHeightMm: number;
  gapXMm: number;
  gapYMm: number;
  capacity?: number;
  facingLimit?: number;
}

export function useBulkGenerateDisplayPositions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkGenerateDisplayPositionBody) =>
      apiClient.post<DisplayPosition[]>("/api/display-positions/bulk", input),
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["display-positions", data[0].surfaceId] });
      }
    },
  });
}
