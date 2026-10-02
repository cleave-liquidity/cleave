"use client";

import { useQuery } from "@tanstack/react-query";
import { FixedYieldQuote } from "@/types/quote";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { useAccount } from "wagmi";

export function useFixedYieldQuote(marketId: string, inputAmount: number) {
  const { chainId } = useAccount();
  const query = useQuery<FixedYieldQuote>({
    queryKey: queryKeys.fixedQuote(marketId, inputAmount, chainId),
    queryFn: () => yieldAdapter.getFixedQuote(marketId, inputAmount),
    enabled: Boolean(marketId) && Number.isFinite(inputAmount) && inputAmount > 0,
    staleTime: 5_000,
    retry: 2,
  });

  return {
    quote: query.data ?? null,
    isLoading: query.isFetching,
    error: query.error,
    refresh: query.refetch,
  };
}
