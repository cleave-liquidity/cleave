"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { robinhoodChainTestnet } from "@/lib/web3/chains";
import {
  getOptionsDeployment,
  optionsErc20Abi,
  optionsMarketAbi,
  OPTIONS_TESTNET_CHAIN_ID,
} from "@/lib/options/options-contract";

export type OptionsPortfolioPosition = {
  optionId: bigint;
  owner: Address;
  kind: "CALL" | "PUT";
  state: "OPEN" | "SETTLED" | "CLAIMED";
  strike: bigint;
  expiry: bigint;
  notional: bigint;
  premium: bigint;
  settlementRate: bigint;
  payout: bigint;
  openedAt: bigint;
  transactionHash?: `0x${string}`;
  collateralDecimals: number;
};

const optionOpenedEvent = parseAbiItem(
  "event OptionOpened(uint256 indexed optionId, address indexed owner, uint8 indexed kind, uint256 strike, uint256 expiry, uint256 notional, uint256 premium)",
);

const optionStates = ["OPEN", "SETTLED", "CLAIMED"] as const;

export function useOptionsPositions() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: OPTIONS_TESTNET_CHAIN_ID });
  const deployment = getOptionsDeployment(OPTIONS_TESTNET_CHAIN_ID);
  const query = useQuery({
    queryKey: ["yeltra-options-positions", address?.toLowerCase(), deployment?.market, deployment?.deploymentBlock?.toString()],
    enabled: Boolean(address && publicClient && deployment?.deploymentBlock !== undefined),
    staleTime: 15_000,
    queryFn: async (): Promise<OptionsPortfolioPosition[]> => {
      if (!address || !publicClient || !deployment?.deploymentBlock) return [];
      const collateralToken = deployment.collateralToken || await publicClient.readContract({
        address: deployment.market,
        abi: optionsMarketAbi,
        functionName: "collateralToken",
      });
      const collateralDecimals = Number(await publicClient.readContract({
        address: collateralToken,
        abi: optionsErc20Abi,
        functionName: "decimals",
      }));
      const logs = await publicClient.getLogs({
        address: deployment.market,
        event: optionOpenedEvent,
        args: { owner: address },
        fromBlock: deployment.deploymentBlock,
      });
      return Promise.all(
        logs.map(async (log) => {
          const optionId = log.args.optionId as bigint;
          const values = await publicClient.readContract({
            address: deployment.market,
            abi: optionsMarketAbi,
            functionName: "options",
            args: [optionId],
          });
          return {
            optionId,
            owner: values[0],
            kind: Number(values[1]) === 0 ? "CALL" : "PUT",
            state: optionStates[Number(values[2])] || "OPEN",
            strike: values[3],
            expiry: values[4],
            notional: values[5],
            premium: values[6],
            settlementRate: values[7],
            payout: values[8],
            openedAt: values[9],
            transactionHash: log.transactionHash,
            collateralDecimals,
          } satisfies OptionsPortfolioPosition;
        }),
      );
    },
  });

  return {
    positions: query.data ?? [],
    connectedAddress: address,
    isLoading: query.isFetching,
    error: query.error,
    configured: Boolean(deployment),
    historyConfigured: deployment?.deploymentBlock !== undefined,
    testnet: robinhoodChainTestnet,
    refresh: query.refetch,
  };
}
