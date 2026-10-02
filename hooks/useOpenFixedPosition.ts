"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FixedYieldQuote } from "@/types/quote";
import { FixedYieldPosition } from "@/types/position";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";

export interface OpenFixedPositionInput {
  marketId: string;
  inputAmount: number;
  userAddress: `0x${string}`;
  quote: FixedYieldQuote;
  chainId: number;
  quoteAsset: string;
}

export function useOpenFixedPosition() {
  const queryClient = useQueryClient();
  return useMutation<FixedYieldPosition, Error, OpenFixedPositionInput>({
    mutationFn: ({ marketId, inputAmount, userAddress, quote, chainId }) =>
      yieldAdapter.openFixedPosition(marketId, inputAmount, userAddress, quote, chainId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress, variables.chainId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.balance(variables.userAddress, variables.quoteAsset, variables.chainId),
      });
    },
  });
}
