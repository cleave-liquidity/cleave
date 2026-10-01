"use client";

import { useQuery } from "@tanstack/react-query";
import { LongYieldQuote } from "@/types/quote";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";

export function useLongYieldQuote(marketId: string, inputAmount: number) {
  const query = useQuery<LongYieldQuote>({
    queryKey: queryKeys.longQuote(marketId, inputAmount),
    queryFn: () => yieldAdapter.getLongQuote(marketId, inputAmount),
    enabled: Boolean(marketId) && Number.isFinite(inputAmount) && inputAmount > 0,
    staleTime: 5_000,
  });

  return {
    quote: query.data ?? null,
    isLoading: query.isFetching,
    error: query.error,
    refresh: query.refetch,
  };
}
