"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FixedYieldQuote } from "@/types/quote";
import { FixedYieldPosition } from "@/types/position";
import type { TransactionHash } from "@/types/transaction";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { usePublicClient, useWalletClient } from "wagmi";

export interface OpenFixedPositionInput {
  marketId: string;
  inputAmount: number;
  userAddress: `0x${string}`;
  quote: FixedYieldQuote;
  chainId: number;
  quoteAsset: string;
  onTransactionSubmitted?: (hash: TransactionHash) => void;
}

export function useOpenFixedPosition() {
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  return useMutation<FixedYieldPosition, Error, OpenFixedPositionInput>({
    mutationFn: ({ marketId, inputAmount, userAddress, quote, chainId, onTransactionSubmitted }) =>
      yieldAdapter.openFixedPosition(marketId, inputAmount, userAddress, quote, chainId, { publicClient, walletClient, onTransactionSubmitted }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions(variables.userAddress, variables.chainId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.balancePrefix(variables.userAddress, variables.chainId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.nativeBalance(variables.userAddress, variables.chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allowancePrefix(variables.userAddress, variables.chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.markets(variables.chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.market(variables.marketId, variables.chainId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.fixedQuote(variables.marketId, variables.inputAmount, variables.chainId) });
    },
  });
}
