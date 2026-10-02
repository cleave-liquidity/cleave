"use client";

import { useQuery } from "@tanstack/react-query";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { useAccount } from "wagmi";
import { usePublicClient } from "wagmi";

export function usePositions(userAddress?: `0x${string}`) {
  const { chainId } = useAccount();
  const publicClient = usePublicClient();
  const query = useQuery({
    queryKey: queryKeys.positions(userAddress, chainId),
    queryFn: () => yieldAdapter.getPositions(userAddress, chainId, { publicClient }),
    enabled: Boolean(userAddress),
    staleTime: 15_000,
    refetchInterval: yieldAdapter.mode === "live" ? 15_000 : false,
    refetchOnWindowFocus: yieldAdapter.mode === "live",
    retry: 2,
  });

  return {
    positions: query.data ?? [],
    isLoading: query.isFetching,
    error: query.error,
    refresh: query.refetch,
  };
}
