"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { balanceAdapter } from "@/lib/adapters/balance-adapter";
import { useAccount } from "wagmi";

export function useTokenBalance(address: `0x${string}` | undefined, token: string) {
  const { chainId } = useAccount();
  const query = useQuery({
    queryKey: queryKeys.balance(address, token, chainId),
    queryFn: () => balanceAdapter.getTokenBalance(address as `0x${string}`, token),
    enabled: Boolean(address && token),
    staleTime: 15_000,
    retry: 2,
  });

  return {
    balance: query.data ?? 0,
    isLoading: query.isFetching,
    error: query.error,
  };
}
