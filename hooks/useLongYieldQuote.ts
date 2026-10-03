"use client";

import { useQuery } from "@tanstack/react-query";
import { LongYieldQuote } from "@/types/quote";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { queryKeys } from "@/lib/query-keys";
import { usePublicClient } from "wagmi";
import { getConfiguredChainId } from "@/lib/web3/environment";

export function useLongYieldQuote(
  marketId: string,
  inputAmount: number,
  options?: { enabled?: boolean },
) {
  const chainId = getConfiguredChainId();
  const publicClient = usePublicClient({ chainId });
  const enabled = options?.enabled ?? true;
  const query = useQuery<LongYieldQuote>({
    queryKey: queryKeys.longQuote(marketId, inputAmount, chainId),
    queryFn: () => yieldAdapter.getLongQuote(marketId, inputAmount, { publicClient }),
    enabled: enabled && Boolean(marketId) && Number.isFinite(inputAmount) && inputAmount > 0,
    staleTime: 5_000,
    refetchInterval: yieldAdapter.mode === "live" ? 15_000 : false,
    refetchOnWindowFocus: yieldAdapter.mode === "live",
    retry: 2,
  });

  return {
    quote: enabled ? query.data ?? null : null,
    isLoading: enabled && query.isFetching,
    error: enabled ? query.error : null,
    refresh: query.refetch,
  };
}
