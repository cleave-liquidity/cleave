"use client";

import { useQuery } from "@tanstack/react-query";
import { erc20Abi, formatUnits, parseAbi, type Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import type { YieldMarket } from "@/types/market";
import { getDividendMarketConfig } from "@/lib/dividend/dividend-config";
import { ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";

const pendleMarketReadAbi = parseAbi([
  "function readTokens() view returns (address SY, address PT, address YT)",
  "function expiry() view returns (uint256)",
]);

const pendleSyReadAbi = parseAbi([
  "function getTokensIn() view returns (address[] tokens)",
  "function exchangeRate() view returns (uint256)",
]);

const robinhoodStockTokenReadAbi = parseAbi([
  "function uiMultiplier() view returns (uint256)",
]);

type MainnetDividendMarket = Pick<YieldMarket, "id"> &
  Partial<
    Pick<
      YieldMarket,
      | "chainId"
      | "marketAddress"
      | "ytAddress"
      | "underlyingTokenAddress"
      | "providerId"
      | "marketType"
      | "execution"
      | "status"
      | "maturityDate"
      | "maturityType"
    >
  >;

export type VerifiedMainnetYtPosition = {
  owner?: Address;
  marketId: string;
  marketAddress: Address;
  ytAddress: Address;
  underlyingAddress: Address;
  balanceBaseUnits?: bigint;
  decimals: number;
  maturityTimestamp: bigint;
  stockTokenMultiplier?: bigint;
  syExchangeRate: bigint;
  multiplierAligned?: boolean;
  blockNumber: bigint;
  positionId?: string;
};

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export function useMainnetDividendYtPosition(
  market: MainnetDividendMarket,
  enabled = true,
) {
  const account = useAccount();
  const publicClient = usePublicClient({ chainId: ROBINHOOD_CHAIN_ID });
  const marketConfig = getDividendMarketConfig(market);
  const owner = account.isConnected ? account.address : undefined;
  const marketAddress = market.marketAddress;
  const ytAddress = market.ytAddress;
  const underlyingAddress = market.underlyingTokenAddress;
  const canRead = Boolean(
    enabled &&
      marketConfig?.chainId === ROBINHOOD_CHAIN_ID &&
      (market.chainId === undefined || market.chainId === ROBINHOOD_CHAIN_ID) &&
      marketAddress &&
      ytAddress &&
      underlyingAddress &&
      publicClient,
  );

  const query = useQuery({
    queryKey: [
      "dividend-mainnet-yt-position",
      owner?.toLowerCase(),
      marketConfig?.marketId,
      marketAddress?.toLowerCase(),
      ytAddress?.toLowerCase(),
    ],
    enabled: canRead,
    staleTime: 10_000,
    refetchInterval: canRead ? 20_000 : false,
    retry: false,
    queryFn: async (): Promise<VerifiedMainnetYtPosition> => {
      if (
        !publicClient ||
        !marketConfig ||
        !marketAddress ||
        !ytAddress ||
        !underlyingAddress
      ) {
        throw new Error("Mainnet position read is not configured.");
      }

      if (
        marketConfig.chainId !== ROBINHOOD_CHAIN_ID ||
        marketConfig.marketId.toLowerCase() !== marketAddress.toLowerCase() ||
        market.id.toLowerCase() !== marketAddress.toLowerCase() ||
        !sameAddress(marketConfig.tokenAddress, underlyingAddress)
      ) {
        throw new Error("Market identity does not match the configured dividend market.");
      }

      const chainId = await publicClient.getChainId();
      if (chainId !== ROBINHOOD_CHAIN_ID) {
        throw new Error("Configured public client is not connected to Robinhood Mainnet.");
      }

      const [marketCode, ytCode, underlyingCode] = await Promise.all([
        publicClient.getBytecode({ address: marketAddress }),
        publicClient.getBytecode({ address: ytAddress }),
        publicClient.getBytecode({ address: underlyingAddress }),
      ]);
      if ([marketCode, ytCode, underlyingCode].some((code) => !code || code === "0x")) {
        throw new Error("Market, YT, or underlying contract bytecode is unavailable.");
      }

      const blockNumber = await publicClient.getBlockNumber();
      const [tokens, maturityTimestamp, decimals] = await Promise.all([
        publicClient.readContract({
          address: marketAddress,
          abi: pendleMarketReadAbi,
          functionName: "readTokens",
          blockNumber,
        }),
        publicClient.readContract({
          address: marketAddress,
          abi: pendleMarketReadAbi,
          functionName: "expiry",
          blockNumber,
        }),
        publicClient.readContract({
          address: ytAddress,
          abi: erc20Abi,
          functionName: "decimals",
          blockNumber,
        }),
      ]);
      const [syAddress, , marketYtAddress] = tokens;
      if (!sameAddress(marketYtAddress, ytAddress)) {
        throw new Error("Market YT address does not match the live market contract.");
      }

      const syCode = await publicClient.getBytecode({ address: syAddress });
      if (!syCode || syCode === "0x") {
        throw new Error("Market SY contract bytecode is unavailable.");
      }

      const [syInputs, syExchangeRate, balanceBaseUnits] = await Promise.all([
        publicClient.readContract({
          address: syAddress,
          abi: pendleSyReadAbi,
          functionName: "getTokensIn",
          blockNumber,
        }),
        publicClient.readContract({
          address: syAddress,
          abi: pendleSyReadAbi,
          functionName: "exchangeRate",
          blockNumber,
        }),
        owner
          ? publicClient.readContract({
              address: ytAddress,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [owner],
              blockNumber,
            })
          : Promise.resolve(undefined),
      ]);
      if (!syInputs.some((token) => sameAddress(token, underlyingAddress))) {
        throw new Error("Market SY inputs do not include the configured underlying token.");
      }

      let stockTokenMultiplier: bigint | undefined;
      try {
        stockTokenMultiplier = await publicClient.readContract({
          address: underlyingAddress,
          abi: robinhoodStockTokenReadAbi,
          functionName: "uiMultiplier",
          blockNumber,
        });
      } catch {
        // Non-Robinhood stock-token underlyings may not expose ERC-8056.
      }

      return {
        owner,
        marketId: market.id,
        marketAddress,
        ytAddress,
        underlyingAddress,
        balanceBaseUnits,
        decimals,
        maturityTimestamp,
        stockTokenMultiplier,
        syExchangeRate,
        multiplierAligned:
          stockTokenMultiplier === undefined
            ? undefined
            : stockTokenMultiplier === syExchangeRate,
        blockNumber,
        positionId: owner
          ? `live:${ROBINHOOD_CHAIN_ID}:${owner.toLowerCase()}:${market.id}:long`
          : undefined,
      };
  },
  });

  const data = query.data;
  return {
    address: owner,
    connected: account.isConnected,
    walletChainId: account.chainId,
    networkMatches: !account.isConnected || account.chainId === ROBINHOOD_CHAIN_ID,
    isLoading: query.isLoading || query.isFetching,
    readUnavailable: Boolean(query.error),
    hasPosition: Boolean(data?.balanceBaseUnits && data.balanceBaseUnits > BigInt(0)),
    data,
    formattedBalance:
      data?.balanceBaseUnits !== undefined
        ? formatUnits(data.balanceBaseUnits, data.decimals)
        : undefined,
    refresh: query.refetch,
  };
}
