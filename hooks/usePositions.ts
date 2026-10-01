"use client";

import { useQuery } from "@tanstack/react-query";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";

export function usePositions(userAddress?: `0x${string}`) {
  const query = useQuery({
    queryKey: queryKeys.positions(userAddress),
    queryFn: () => yieldAdapter.getPositions(userAddress),
    enabled: Boolean(userAddress),
    staleTime: 15_000,
  });

  return {
    positions: query.data ?? [],
    isLoading: query.isFetching,
    error: query.error,
    refresh: query.refetch,
  };
}
