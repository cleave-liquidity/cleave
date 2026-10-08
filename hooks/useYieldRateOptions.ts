"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatUnits,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { robinhoodChainTestnet } from "@/lib/web3/chains";
import {
  getOptionsDeployment,
  OPTIONS_TESTNET_CHAIN_ID,
  optionsErc20Abi,
  optionsMarketAbi,
  optionsVaultAbi,
  rateIndexAbi,
  type OptionsDeployment,
} from "@/lib/options/options-contract";

export type OptionsKind = "CALL" | "PUT";

export type OptionsQuote = {
  premium: bigint;
  maxPayout: bigint;
  currentRate: bigint;
  observedAt: bigint;
  fresh: boolean;
  expiry: bigint;
  notional: bigint;
  strike: bigint;
};

export type OptionsReadState = {
  currentRate: bigint;
  observedAt: bigint;
  fresh: boolean;
  sourceLabel: string;
  maxStaleness: bigint;
  availableCollateral: bigint;
  collateralToken: Address;
  collateralSymbol: string;
  collateralDecimals: number;
};

export type OptionsPosition = {
  owner: Address;
  kind: number;
  state: number;
  strike: bigint;
  expiry: bigint;
  notional: bigint;
  premium: bigint;
  settlementRate: bigint;
  payout: bigint;
  openedAt: bigint;
};

function kindValue(kind: OptionsKind): number {
  return kind === "CALL" ? 0 : 1;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The Testnet Options contract read failed.";
}

export function useYieldRateOptions(optionId?: bigint) {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: OPTIONS_TESTNET_CHAIN_ID });
  const publicClient = usePublicClient({ chainId: OPTIONS_TESTNET_CHAIN_ID });
  const deployment = getOptionsDeployment(OPTIONS_TESTNET_CHAIN_ID);
  const marketAddress = deployment?.market;
  const rateIndexAddress = deployment?.rateIndex;
  const collateralVaultAddress = deployment?.collateralVault;
  const [readState, setReadState] = useState<OptionsReadState>();
  const [quote, setQuote] = useState<OptionsQuote>();
  const [position, setPosition] = useState<OptionsPosition>();
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!publicClient || !marketAddress || !rateIndexAddress || !collateralVaultAddress) {
      setReadState(undefined);
      setError(undefined);
      return;
    }
    setIsLoading(true);
    setError(undefined);
    try {
      const [currentRate, observedAt, fresh, sourceLabel, maxStaleness, availableCollateral, tokenAddress] =
        await Promise.all([
          publicClient.readContract({ address: rateIndexAddress, abi: rateIndexAbi, functionName: "latestRate" }),
          publicClient.readContract({ address: rateIndexAddress, abi: rateIndexAbi, functionName: "latestObservedAt" }),
          publicClient.readContract({ address: rateIndexAddress, abi: rateIndexAbi, functionName: "isFresh" }),
          publicClient.readContract({ address: rateIndexAddress, abi: rateIndexAbi, functionName: "sourceLabel" }),
          publicClient.readContract({ address: rateIndexAddress, abi: rateIndexAbi, functionName: "maxStaleness" }),
          publicClient.readContract({ address: collateralVaultAddress, abi: optionsVaultAbi, functionName: "availableCollateral" }),
          publicClient.readContract({ address: marketAddress, abi: optionsMarketAbi, functionName: "collateralToken" }),
        ]);
      const [collateralSymbol, collateralDecimals] = await Promise.all([
        publicClient.readContract({ address: tokenAddress, abi: optionsErc20Abi, functionName: "symbol" }),
        publicClient.readContract({ address: tokenAddress, abi: optionsErc20Abi, functionName: "decimals" }),
      ]);
      setReadState({
        currentRate,
        observedAt,
        fresh,
        sourceLabel,
        maxStaleness,
        availableCollateral,
        collateralToken: tokenAddress,
        collateralSymbol,
        collateralDecimals: Number(collateralDecimals),
      });
      if (optionId !== undefined) {
        const values = await publicClient.readContract({
          address: marketAddress,
          abi: optionsMarketAbi,
          functionName: "options",
          args: [optionId],
        });
        setPosition({
          owner: values[0],
          kind: Number(values[1]),
          state: Number(values[2]),
          strike: values[3],
          expiry: values[4],
          notional: values[5],
          premium: values[6],
          settlementRate: values[7],
          payout: values[8],
          openedAt: values[9],
        });
      }
    } catch (readFailure) {
      setReadState(undefined);
      setPosition(undefined);
      setError(readErrorMessage(readFailure));
    } finally {
      setIsLoading(false);
    }
  }, [collateralVaultAddress, marketAddress, optionId, publicClient, rateIndexAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getQuote = useCallback(async (input: {
    kind: OptionsKind;
    strike: bigint;
    expiry: bigint;
    notional: bigint;
  }) => {
    if (!publicClient || !marketAddress) throw new Error("Yield Rate Options is not deployed on Testnet.");
    const values = await publicClient.readContract({
      address: marketAddress,
      abi: optionsMarketAbi,
      functionName: "quote",
      args: [kindValue(input.kind), input.strike, input.expiry, input.notional],
    });
    const nextQuote: OptionsQuote = {
      premium: values[0],
      maxPayout: values[1],
      currentRate: values[2],
      observedAt: values[3],
      fresh: values[4],
      expiry: input.expiry,
      notional: input.notional,
      strike: input.strike,
    };
    setQuote(nextQuote);
    return nextQuote;
  }, [marketAddress, publicClient]);

  const approvePremium = useCallback(async (amount: bigint): Promise<Hex> => {
    if (!walletClient || !address || !marketAddress || chainId !== OPTIONS_TESTNET_CHAIN_ID || !readState) {
      throw new Error("Connect the position owner on Robinhood Chain Testnet first.");
    }
    setIsPending(true);
    try {
      const hash = await walletClient.writeContract({
        account: address,
        address: readState.collateralToken,
        abi: optionsErc20Abi,
        functionName: "approve",
        args: [marketAddress, amount],
        chain: robinhoodChainTestnet,
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      return hash;
    } finally {
      setIsPending(false);
    }
  }, [address, chainId, marketAddress, publicClient, readState, walletClient]);

  const openOption = useCallback(async (input: {
    kind: OptionsKind;
    strike: bigint;
    expiry: bigint;
    notional: bigint;
    maximumPremium: bigint;
    deadline: bigint;
  }): Promise<Hex> => {
    if (!walletClient || !address || !marketAddress || chainId !== OPTIONS_TESTNET_CHAIN_ID) {
      throw new Error("Connect the position owner on Robinhood Chain Testnet first.");
    }
    setIsPending(true);
    try {
      const hash = await walletClient.writeContract({
        account: address,
        address: marketAddress,
        abi: optionsMarketAbi,
        functionName: "openOption",
        args: [kindValue(input.kind), input.strike, input.expiry, input.notional, input.maximumPremium, input.deadline],
        chain: robinhoodChainTestnet,
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      await refresh();
      return hash;
    } finally {
      setIsPending(false);
    }
  }, [address, chainId, marketAddress, publicClient, refresh, walletClient]);

  const settleOption = useCallback(async (): Promise<Hex> => {
    if (!walletClient || !address || !marketAddress || chainId !== OPTIONS_TESTNET_CHAIN_ID || optionId === undefined) {
      throw new Error("Connect the option owner or settlement operator on Robinhood Chain Testnet first.");
    }
    setIsPending(true);
    try {
      const hash = await walletClient.writeContract({
        account: address,
        address: marketAddress,
        abi: optionsMarketAbi,
        functionName: "settle",
        args: [optionId],
        chain: robinhoodChainTestnet,
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      await refresh();
      return hash;
    } finally {
      setIsPending(false);
    }
  }, [address, chainId, marketAddress, optionId, publicClient, refresh, walletClient]);

  const claimOption = useCallback(async (): Promise<Hex> => {
    if (!walletClient || !address || !marketAddress || chainId !== OPTIONS_TESTNET_CHAIN_ID || optionId === undefined) {
      throw new Error("Connect the option owner on Robinhood Chain Testnet first.");
    }
    setIsPending(true);
    try {
      const hash = await walletClient.writeContract({
        account: address,
        address: marketAddress,
        abi: optionsMarketAbi,
        functionName: "claim",
        args: [optionId],
        chain: robinhoodChainTestnet,
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      await refresh();
      return hash;
    } finally {
      setIsPending(false);
    }
  }, [address, chainId, marketAddress, optionId, publicClient, refresh, walletClient]);

  return {
    configured: Boolean(deployment),
    deployment: deployment as OptionsDeployment | undefined,
    chainId: OPTIONS_TESTNET_CHAIN_ID,
    connectedChainId: chainId,
    connectedAddress: address,
    readState,
    quote,
    position,
    isLoading,
    isPending,
    error,
    refresh,
    getQuote,
    approvePremium,
    openOption,
    settleOption,
    claimOption,
    formatCollateral: (value: bigint) => readState ? formatUnits(value, readState.collateralDecimals) : "—",
    parseCollateral: (value: string) => readState ? parseUnits(value || "0", readState.collateralDecimals) : BigInt(0),
    parseRatePercent: (value: string) => parseUnits(value || "0", 16),
  };
}
