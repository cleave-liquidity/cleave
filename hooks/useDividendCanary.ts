"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import type { Address } from "viem";
import {
  dividendAccountingMarketAbi,
  dividendLensAbi,
  dividendRegistryAbi,
  getDividendDeployment,
  NVDA_DIVIDEND_TESTNET_MARKET_ID,
  NVDA_DIVIDEND_TESTNET_OWNER,
  NVDA_DIVIDEND_TESTNET_POSITION_ID,
  type DividendAccountingMarketState,
  type DividendLensState,
} from "@/lib/dividend/dividend-contract";
import { ROBINHOOD_TESTNET_CHAIN_ID } from "@/lib/web3/chains";

type DividendCanaryMarket = {
  underlying: Address;
  sourceAdapter: Address;
  protocolFeeBps: number;
  lastRateBaseUnits: bigint;
  lastRateDecimals: number;
  lastEventId: `0x${string}`;
  lastEventTimestamp: bigint;
  lastSequence: bigint;
  enabled: boolean;
  paused: boolean;
};

export function useDividendCanary() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: ROBINHOOD_TESTNET_CHAIN_ID });
  const deployment = useMemo(
    () => getDividendDeployment(ROBINHOOD_TESTNET_CHAIN_ID),
    [],
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [market, setMarket] = useState<DividendCanaryMarket>();
  const [accountingMarket, setAccountingMarket] =
    useState<DividendAccountingMarketState>();
  const [publicState, setPublicState] = useState<DividendLensState>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const requestId = useRef(0);
  const hydratedWalletChainId = isHydrated ? chainId : undefined;
  const hydratedIsConnected = isHydrated && isConnected;
  const ownsPosition =
    isHydrated &&
    Boolean(address) &&
    chainId === ROBINHOOD_TESTNET_CHAIN_ID &&
    address?.toLowerCase() === NVDA_DIVIDEND_TESTNET_OWNER.toLowerCase();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!deployment) {
      setMarket(undefined);
      setAccountingMarket(undefined);
      setPublicState(undefined);
      setError("TESTNET_DIVIDEND_DEPLOYMENT_NOT_CONFIGURED");
      return;
    }
    if (!publicClient) {
      setMarket(undefined);
      setAccountingMarket(undefined);
      setPublicState(undefined);
      setError("TESTNET_DIVIDEND_RPC_UNAVAILABLE");
      return;
    }

    setIsLoading(true);
    setError(undefined);
    try {
      const accounting =
        deployment.accounting ||
        (await publicClient.readContract({
          address: deployment.registry,
          abi: dividendRegistryAbi,
          functionName: "accounting",
        }));
      const [marketResult, accountingMarketResult, stateResult] =
        await Promise.all([
          publicClient.readContract({
            address: deployment.registry,
            abi: dividendRegistryAbi,
            functionName: "getMarket",
            args: [NVDA_DIVIDEND_TESTNET_MARKET_ID],
          }),
          publicClient.readContract({
            address: accounting,
            abi: dividendAccountingMarketAbi,
            functionName: "markets",
            args: [NVDA_DIVIDEND_TESTNET_MARKET_ID],
          }),
          publicClient.readContract({
            address: deployment.lens,
            abi: dividendLensAbi,
            functionName: "dividendState",
            args: [
              NVDA_DIVIDEND_TESTNET_MARKET_ID,
              NVDA_DIVIDEND_TESTNET_POSITION_ID,
            ],
          }),
        ]);
      if (currentRequest !== requestId.current) return;
      setMarket(marketResult as DividendCanaryMarket);
      const [index, exposureDecimals, rewardDecimals, enabled] =
        accountingMarketResult as readonly [bigint, number, number, boolean];
      setAccountingMarket({
        index,
        exposureDecimals,
        rewardDecimals,
        enabled,
      });
      setPublicState(stateResult as DividendLensState);
    } catch {
      if (currentRequest !== requestId.current) return;
      setMarket(undefined);
      setAccountingMarket(undefined);
      setPublicState(undefined);
      setError("TESTNET_DIVIDEND_READ_UNAVAILABLE");
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [deployment, publicClient]);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  return {
    chainId: hydratedWalletChainId,
    isConnected: hydratedIsConnected,
    isHydrated,
    configured: Boolean(deployment),
    isLoading,
    error,
    market,
    accountingMarket,
    // Lens data is public read-only chain state. Ownership is kept separate so
    // the UI never presents the canary as the connected wallet's holdings.
    state: publicState,
    publicState,
    ownsPosition,
    canaryOwner: NVDA_DIVIDEND_TESTNET_OWNER,
    refresh,
  };
}
