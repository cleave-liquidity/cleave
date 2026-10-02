"use client";

import { useQuery } from "@tanstack/react-query";
import { YieldMarket } from "@/types/market";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { useAccount } from "wagmi";

export function useMarket(id: string) {
  const { chainId } = useAccount();
  const query = useQuery<YieldMarket | null>({
    queryKey: queryKeys.market(id, chainId),
    queryFn: () => yieldAdapter.getMarket(id),
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: 2,
  });

  return {
    market: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  };
}
