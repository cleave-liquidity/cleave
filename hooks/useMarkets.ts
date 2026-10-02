"use client";

import { useQuery } from "@tanstack/react-query";
import { YieldMarket } from "@/types/market";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { useAccount } from "wagmi";

export function useMarkets() {
  const { chainId } = useAccount();
  const query = useQuery<YieldMarket[]>({
    queryKey: queryKeys.markets(chainId),
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
