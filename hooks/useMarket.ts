"use client";

import { useQuery } from "@tanstack/react-query";
import { YieldMarket } from "@/types/market";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";

export function useMarket(id: string) {
  const query = useQuery<YieldMarket | null>({
    queryKey: queryKeys.market(id),
    queryFn: () => yieldAdapter.getMarket(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  });

  return {
    market: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  };
}
