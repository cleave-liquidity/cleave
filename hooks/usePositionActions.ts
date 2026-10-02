"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

interface PositionActionInput {
  positionId: string;
  userAddress: `0x${string}`;
}

export function useClaimYield() {
  const queryClient = useQueryClient();
  const { chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  return useMutation({
    mutationFn: ({ positionId, userAddress }: PositionActionInput) =>
      yieldAdapter.claimYield(positionId, userAddress, chainId, { publicClient, walletClient }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.balancePrefix(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allowancePrefix(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.markets(chainId) });
    },
  });
}

export function useRedeemFixed() {
  const queryClient = useQueryClient();
  const { chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  return useMutation({
    mutationFn: ({ positionId, userAddress }: PositionActionInput) =>
      yieldAdapter.redeemFixed(positionId, userAddress, chainId, { publicClient, walletClient }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.balancePrefix(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allowancePrefix(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.markets(chainId) });
    },
  });
}

export function useSellPosition() {
  const queryClient = useQueryClient();
  const { chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  return useMutation({
    mutationFn: ({ positionId, userAddress }: PositionActionInput) =>
      yieldAdapter.sellPosition(positionId, userAddress, chainId, { publicClient, walletClient }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.balancePrefix(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allowancePrefix(variables.userAddress, chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.markets(chainId) });
    },
  });
}
