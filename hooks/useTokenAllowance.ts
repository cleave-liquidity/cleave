"use client";

import { useQuery } from "@tanstack/react-query";
import { isAddress, type Address } from "viem";
import { usePublicClient } from "wagmi";
import { queryKeys } from "@/lib/query-keys";
import { ViemTokenAllowanceAdapter } from "@/lib/web3/token-allowance";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { YieldDomainError } from "@/types/errors";

export function useTokenAllowance(
  owner: Address | undefined,
  tokenAddress: string | undefined,
  spender: Address | undefined,
  chainId: number | undefined,
) {
  const publicClient = usePublicClient({ chainId });
  const query = useQuery<bigint>({
    queryKey: queryKeys.allowance(owner, tokenAddress ?? "unknown-token", spender ?? "unknown-spender", chainId),
    queryFn: async () => {
      if (
        yieldAdapter.mode !== "live" ||
        !owner ||
        !tokenAddress ||
        !spender ||
        !chainId ||
        !publicClient ||
        !isAddress(tokenAddress)
      ) {
        throw new YieldDomainError("live-source-unavailable", "Live allowance configuration is unavailable.");
      }
      return new ViemTokenAllowanceAdapter(publicClient).getAllowance(
        tokenAddress,
        owner,
        spender,
        chainId,
      );
    },
    enabled: yieldAdapter.mode === "live" && Boolean(owner && tokenAddress && spender && chainId && publicClient),
    staleTime: 15_000,
    refetchInterval: yieldAdapter.mode === "live" ? 15_000 : false,
    refetchOnWindowFocus: yieldAdapter.mode === "live",
    retry: 2,
  });

  return {
    allowance: query.data ?? null,
    isLoading: query.isFetching,
    error: query.error,
    refresh: query.refetch,
  };
}
