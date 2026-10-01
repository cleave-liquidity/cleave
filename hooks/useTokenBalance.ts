"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { balanceAdapter } from "@/lib/adapters/balance-adapter";

export function useTokenBalance(address: `0x${string}` | undefined, token: string) {
  const query = useQuery({
    queryKey: queryKeys.balance(address, token),
    queryFn: () => balanceAdapter.getTokenBalance(address as `0x${string}`, token),
    enabled: Boolean(address && token),
    staleTime: 15_000,
  });

  return {
    balance: query.data ?? 0,
    isLoading: query.isFetching,
    error: query.error,
  };
}
