"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { balanceAdapter } from "@/lib/adapters/balance-adapter";
import { ViemBalanceAdapter } from "@/lib/adapters/balance-adapter";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { YieldDomainError } from "@/types/errors";
import { isAddress } from "viem";
import { usePublicClient } from "wagmi";

export function useTokenBalance(
  address: `0x${string}` | undefined,
  token: string,
  tokenAddress?: string,
  tokenDecimals?: number,
  tokenChainId?: number,
) {
  const chainId = tokenChainId;
  const publicClient = usePublicClient({ chainId });
  const query = useQuery({
    queryKey: queryKeys.balance(address, tokenAddress ?? token, chainId),
    queryFn: async () => {
      if (yieldAdapter.mode === "live") {
        if (!address || !tokenAddress || !isAddress(tokenAddress) || !chainId || !publicClient) {
          throw new YieldDomainError("live-source-unavailable", "Live token balance configuration is unavailable.");
        }
        const snapshot = await new ViemBalanceAdapter(publicClient).getTokenBalance(
          {
            address: tokenAddress,
            symbol: token,
            name: token,
            decimals: tokenDecimals ?? 0,
            chainId: chainId as 4663 | 46630,
          },
          address,
        );
        return Number(snapshot.formatted);
      }
      return balanceAdapter.getTokenBalance(address as `0x${string}`, token);
    },
    enabled: Boolean(address && token),
    staleTime: 15_000,
    refetchInterval: yieldAdapter.mode === "live" ? 15_000 : false,
    refetchOnWindowFocus: yieldAdapter.mode === "live",
    retry: 2,
  });

  return {
    balance: query.data ?? 0,
    /** True once a balance has actually been read (balance falls back to 0 until then). */
    hasBalance: query.data !== undefined,
    isLoading: query.isFetching,
    error: query.error,
  };
}
