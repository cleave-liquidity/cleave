"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";

interface PositionActionInput {
  positionId: string;
  userAddress: `0x${string}`;
}

export function useClaimYield() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ positionId, userAddress }: PositionActionInput) =>
      yieldAdapter.claimYield(positionId, userAddress),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.balancePrefix(variables.userAddress) });
    },
  });
}

export function useRedeemFixed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ positionId, userAddress }: PositionActionInput) =>
      yieldAdapter.redeemFixed(positionId, userAddress),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.balancePrefix(variables.userAddress) });
    },
  });
}

export function useSellPosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ positionId, userAddress }: PositionActionInput) =>
      yieldAdapter.sellPosition(positionId, userAddress),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.balancePrefix(variables.userAddress) });
    },
  });
}
