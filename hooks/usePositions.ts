"use client";

import { useQuery } from "@tanstack/react-query";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { useAccount } from "wagmi";

export function usePositions(userAddress?: `0x${string}`) {
  const { chainId } = useAccount();
  const query = useQuery({
    queryKey: queryKeys.positions(userAddress, chainId),
    queryFn: () => yieldAdapter.getPositions(userAddress, chainId),
    enabled: Boolean(userAddress),
    staleTime: 15_000,
    retry: 2,
  });

  return {
    positions: query.data ?? [],
    isLoading: query.isFetching,
    error: query.error,
    refresh: query.refetch,
  };
}
