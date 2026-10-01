"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LongYieldQuote } from "@/types/quote";
import { LongYieldPosition } from "@/types/position";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";

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
  return useMutation<LongYieldPosition, Error, OpenLongPositionInput>({
    mutationFn: ({ marketId, inputAmount, userAddress, quote, chainId }) =>
      yieldAdapter.openLongPosition(marketId, inputAmount, userAddress, quote, chainId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.balance(variables.userAddress, variables.quoteAsset),
      });
    },
  });
}
