"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LongYieldQuote } from "@/types/quote";
import { LongYieldPosition } from "@/types/position";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { usePublicClient, useWalletClient } from "wagmi";

export interface OpenLongPositionInput {
  marketId: string;
  inputAmount: number;
  userAddress: `0x${string}`;
  quote: LongYieldQuote;
  chainId: number;
  quoteAsset: string;
}

export function useOpenLongPosition() {
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  return useMutation<LongYieldPosition, Error, OpenLongPositionInput>({
    mutationFn: ({ marketId, inputAmount, userAddress, quote, chainId }) =>
      yieldAdapter.openLongPosition(marketId, inputAmount, userAddress, quote, chainId, { publicClient, walletClient }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress, variables.chainId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.balancePrefix(variables.userAddress, variables.chainId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.nativeBalance(variables.userAddress, variables.chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allowancePrefix(variables.userAddress, variables.chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.markets(variables.chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.market(variables.marketId, variables.chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.longQuote(variables.marketId, variables.inputAmount, variables.chainId) });
    },
  });
}
