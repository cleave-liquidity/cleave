"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { balanceAdapter } from "@/lib/adapters/balance-adapter";
import { ViemBalanceAdapter } from "@/lib/adapters/balance-adapter";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { YieldDomainError } from "@/types/errors";
import { isAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";

export function useTokenBalance(
  address: `0x${string}` | undefined,
  token: string,
  tokenAddress?: string,
  tokenDecimals?: number,
  tokenChainId?: number,
) {
  const { chainId } = useAccount();
  const publicClient = usePublicClient();
  const query = useQuery({
    queryKey: queryKeys.balance(address, tokenAddress ?? token, chainId),
    queryFn: async () => {
      if (yieldAdapter.mode === "live") {
        if (!address || !tokenAddress || !isAddress(tokenAddress) || !tokenChainId || !publicClient) {
          throw new YieldDomainError("live-source-unavailable", "Live token balance configuration is unavailable.");
        }
        const snapshot = await new ViemBalanceAdapter(publicClient).getTokenBalance(
          {
            address: tokenAddress,
            symbol: token,
            name: token,
            decimals: tokenDecimals ?? 0,
            chainId: tokenChainId as 4663 | 46630,
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
    isLoading: query.isFetching,
    error: query.error,
  };
}
