"use client";

import { useQuery } from "@tanstack/react-query";
import { YieldMarket } from "@/types/market";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { getConfiguredChainId } from "@/lib/web3/environment";

export function useMarkets() {
  const browseChainId = getConfiguredChainId();
  const query = useQuery<YieldMarket[]>({
    queryKey: queryKeys.markets(browseChainId),
    queryFn: () => yieldAdapter.getMarkets(),
    staleTime: 60_000,
    refetchInterval: yieldAdapter.mode === "live" ? 60_000 : false,
    refetchOnWindowFocus: yieldAdapter.mode === "live",
    retry: 2,
  });

  return {
    markets: query.data ?? [],
    isLoading: query.isPending,
    error: query.error,
  };
}
