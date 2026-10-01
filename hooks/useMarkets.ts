"use client";

import { useQuery } from "@tanstack/react-query";
import { YieldMarket } from "@/types/market";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";

export function useMarkets() {
  const query = useQuery<YieldMarket[]>({
    queryKey: queryKeys.markets,
    queryFn: () => yieldAdapter.getMarkets(),
    staleTime: 60_000,
  });

  return {
    markets: query.data ?? [],
    isLoading: query.isPending,
    error: query.error,
  };
}
