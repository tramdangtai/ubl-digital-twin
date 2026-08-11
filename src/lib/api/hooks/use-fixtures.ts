"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { EntityStatus, Fixture, OwnerCompany } from "@/lib/types/entities";

import { apiClient } from "../client";

export function useFixtures(storeId?: string) {
  return useQuery({
    queryKey: ["fixtures", storeId],
    queryFn: () => apiClient.get<Fixture[]>(`/api/fixtures?store_id=${storeId}`),
    enabled: Boolean(storeId),
  });
}

export interface CreateFixtureBody {
  storeId: string;
  fixtureCode: string;
  fixtureName: string;
  ownerCompany: OwnerCompany;
  fixtureType?: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  positionX: number;
  positionY: number;
  rotationDegree: number;
}

export function useCreateFixture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFixtureBody) => apiClient.post<Fixture>("/api/fixtures", input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fixtures", data.storeId] });
    },
  });
}

export type UpdateFixtureBody = Partial<{
  fixtureCode: string;
  fixtureName: string;
  ownerCompany: OwnerCompany;
  fixtureType: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  positionX: number;
  positionY: number;
  rotationDegree: number;
  status: EntityStatus;
  expectedUpdatedAt: string;
}>;

export function useUpdateFixture(fixtureId: string, storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFixtureBody) =>
      apiClient.patch<Fixture>(`/api/fixtures/${fixtureId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixtures", storeId] });
    },
  });
}
