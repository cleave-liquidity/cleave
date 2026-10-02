"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { useAccount } from "wagmi";

interface PositionActionInput {
  positionId: string;
  userAddress: `0x${string}`;
}

export function useClaimYield() {
  const queryClient = useQueryClient();
  const { chainId } = useAccount();
  return useMutation({
    mutationFn: ({ positionId, userAddress }: PositionActionInput) =>
      yieldAdapter.claimYield(positionId, userAddress, chainId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.balancePrefix(variables.userAddress, chainId) });
    },
  });
}

export function useRedeemFixed() {
  const queryClient = useQueryClient();
  const { chainId } = useAccount();
  return useMutation({
    mutationFn: ({ positionId, userAddress }: PositionActionInput) =>
      yieldAdapter.redeemFixed(positionId, userAddress, chainId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.balancePrefix(variables.userAddress, chainId) });
    },
  });
}

export function useSellPosition() {
  const queryClient = useQueryClient();
  const { chainId } = useAccount();
  return useMutation({
    mutationFn: ({ positionId, userAddress }: PositionActionInput) =>
      yieldAdapter.sellPosition(positionId, userAddress, chainId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.balancePrefix(variables.userAddress, chainId) });
    },
  });
}
