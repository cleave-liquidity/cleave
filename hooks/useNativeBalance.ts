"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { balanceAdapter, ViemBalanceAdapter } from "@/lib/adapters/balance-adapter";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { getNativeBalanceStatus, type NativeBalanceStatus } from "@/lib/markets/native-balance";
import { YieldDomainError } from "@/types/errors";
import type { Address } from "viem";
import type { RobinhoodChainId } from "@/types/market";

export function useNativeBalance(address: Address | undefined, chainId: RobinhoodChainId) {
  const publicClient = usePublicClient({ chainId });
  const canUseLiveClient = yieldAdapter.mode !== "live" || Boolean(publicClient);
  const query = useQuery<number>({
    queryKey: queryKeys.nativeBalance(address, chainId),
    queryFn: async () => {
      if (!address || !chainId) {
        throw new YieldDomainError("wallet-disconnected", "Connect a wallet to read gas balance.");
      }

      if (yieldAdapter.mode === "live") {
        if (!publicClient) {
          throw new YieldDomainError("live-source-unavailable", "Live gas balance configuration is unavailable.");
        }
        const snapshot = await new ViemBalanceAdapter(publicClient).getNativeBalance(address, chainId);
        return Number(snapshot.formatted);
      }

      return balanceAdapter.getGasBalance(address);
    },
    enabled: Boolean(address && chainId && canUseLiveClient),
    staleTime: 15_000,
    refetchInterval: yieldAdapter.mode === "live" ? 15_000 : false,
    refetchOnWindowFocus: yieldAdapter.mode === "live",
    retry: 2,
  });

  const hasBalance = query.data !== undefined && !query.error;
  const status: NativeBalanceStatus = getNativeBalanceStatus({
    isConnected: Boolean(address),
    isLoading: Boolean(address && canUseLiveClient && query.isFetching && !hasBalance),
    hasBalance,
    balance: query.data ?? null,
    error: query.error,
  });

  return {
    balance: status === "resolved" ? query.data ?? null : null,
    hasBalance,
    status,
    isLoading: status === "loading",
    error: query.error,
    refresh: query.refetch,
  };
}
