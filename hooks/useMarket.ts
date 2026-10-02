"use client";

import { useQuery } from "@tanstack/react-query";
import { YieldMarket } from "@/types/market";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { getConfiguredChainId } from "@/lib/web3/environment";

export function useMarket(id: string) {
  const browseChainId = getConfiguredChainId();
  const query = useQuery<YieldMarket | null>({
    queryKey: queryKeys.market(id, browseChainId),
    queryFn: () => yieldAdapter.getMarket(id),
    enabled: Boolean(id),
    staleTime: 60_000,
    refetchInterval: yieldAdapter.mode === "live" ? 60_000 : false,
    refetchOnWindowFocus: yieldAdapter.mode === "live",
    retry: 2,
  });

  return {
    market: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  };
}
