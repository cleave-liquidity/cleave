"use client";

import { useQuery } from "@tanstack/react-query";
import { FixedYieldQuote } from "@/types/quote";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { usePublicClient } from "wagmi";
import { getConfiguredChainId } from "@/lib/web3/environment";

export function useFixedYieldQuote(marketId: string, inputAmount: number) {
  const chainId = getConfiguredChainId();
  const publicClient = usePublicClient({ chainId });
  const query = useQuery<FixedYieldQuote>({
    queryKey: queryKeys.fixedQuote(marketId, inputAmount, chainId),
    queryFn: () => yieldAdapter.getFixedQuote(marketId, inputAmount, { publicClient }),
    enabled: Boolean(marketId) && Number.isFinite(inputAmount) && inputAmount > 0,
    staleTime: 5_000,
    refetchInterval: yieldAdapter.mode === "live" ? 15_000 : false,
    refetchOnWindowFocus: yieldAdapter.mode === "live",
    retry: 2,
  });

  return {
    quote: query.data ?? null,
    isLoading: query.isFetching,
    error: query.error,
    refresh: query.refetch,
  };
}
