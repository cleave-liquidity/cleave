"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePublicClient, useWalletClient } from "wagmi";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import type { ExitQuote } from "@/types/quote";

export function useExitQuote(
  positionId: string,
  userAddress: `0x${string}` | undefined,
  chainId: number,
) {
  const queryClient = useQueryClient();
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient();
  const query = useQuery<ExitQuote>({
    queryKey: queryKeys.exitQuote(positionId, userAddress, chainId),
    queryFn: () => {
      if (!userAddress) throw new Error("Connect a wallet to review this sale.");
      return yieldAdapter.getExitQuote(positionId, userAddress, chainId, { publicClient, walletClient });
    },
    enabled: false,
    staleTime: 0,
    retry: false,
  });

  return {
    quote: query.data,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
    reset: () => queryClient.removeQueries({ queryKey: queryKeys.exitQuote(positionId, userAddress, chainId) }),
  };
}
