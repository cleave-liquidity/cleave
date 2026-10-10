"use client";

import { useCallback, useEffect, useState } from "react";
import {
  decodeEventLog,
  formatUnits,
  parseAbiItem,
  toEventSelector,
  parseUnits,
  type Address,
  type Hex,
  type PublicClient,
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
  kind: OptionsKind;
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
  walletCollateralBalance?: bigint;
  premiumAllowance?: bigint;
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

export class OptionsActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptionsActionError";
  }
}

export class OptionsTransactionRevertedError extends Error {
  constructor(readonly hash: Hex) {
    super(`Transaction was mined but reverted: ${hash}`);
    this.name = "OptionsTransactionRevertedError";
  }
}

const optionOpenedEvent = parseAbiItem(
  "event OptionOpened(uint256 indexed optionId, address indexed owner, uint8 indexed kind, uint256 strike, uint256 expiry, uint256 notional, uint256 premium)",
);
const optionOpenedEventTopic = toEventSelector(optionOpenedEvent);

export function optionsErrorMessage(error: unknown): string {
  if (error instanceof OptionsActionError) return error.message;
  if (error instanceof OptionsTransactionRevertedError) {
    return "The transaction was mined but reverted. Check its explorer receipt before retrying.";
  }
  const errorName = error instanceof Error ? error.name : "";
  const errorText = error instanceof Error ? error.message : String(error);
  if (/userrejected|user rejected|denied/i.test(`${errorName} ${errorText}`)) {
    return "Wallet signature was rejected. No transaction was confirmed.";
  }
  if (/insufficient funds for gas|gas required exceeds|intrinsic transaction cost|transaction costs exceed/i.test(errorText)) {
    return "Insufficient native ETH for Testnet transaction gas. No transaction receipt was confirmed.";
  }
  if (/erc20insufficientbalance|insufficient balance|transfer amount exceeds balance/i.test(errorText)) {
    return "Insufficient yDEVUSD collateral for this Options action.";
  }
  if (/insufficient funds/i.test(errorText)) {
    return "Transaction could not be funded. Check both native ETH for gas and yDEVUSD collateral; no receipt was confirmed.";
  }
  if (/chain mismatch|wrong chain|chain id/i.test(errorText)) {
    return "Switch the connected wallet to Robinhood Chain Testnet (46630).";
  }
  if (/http request failed|fetch failed|network request failed|timeout/i.test(errorText)) {
    return "Robinhood Testnet RPC is unavailable. No live result can be confirmed.";
  }
  if (/revert|execution reverted/i.test(errorText)) {
    return "The Options contract rejected this action. Recheck the quote, allowance, expiry, rate freshness, and collateral capacity.";
  }
  return "Options request failed. No successful on-chain result was confirmed.";
}

function kindValue(kind: OptionsKind): number {
  return kind === "CALL" ? 0 : 1;
}

async function requireSuccessfulReceipt(client: PublicClient, hash: Hex) {
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new OptionsTransactionRevertedError(hash);
  return receipt;
}

export function useYieldRateOptions(optionId?: bigint, enabled = true) {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: OPTIONS_TESTNET_CHAIN_ID });
  const publicClient = usePublicClient({ chainId: OPTIONS_TESTNET_CHAIN_ID });
  const deployment = enabled ? getOptionsDeployment(OPTIONS_TESTNET_CHAIN_ID) : undefined;
  const marketAddress = deployment?.market;
  const rateIndexAddress = deployment?.rateIndex;
  const collateralVaultAddress = deployment?.collateralVault;
  const [readState, setReadState] = useState<OptionsReadState>();
  const [quote, setQuote] = useState<OptionsQuote>();
  const [lastOpenedOptionId, setLastOpenedOptionId] = useState<bigint>();
  const [position, setPosition] = useState<OptionsPosition>();
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!publicClient || !marketAddress || !rateIndexAddress || !collateralVaultAddress) {
      setReadState(undefined);
      setPosition(undefined);
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
      const [walletCollateralBalance, premiumAllowance] = address
        ? await Promise.all([
            publicClient.readContract({
              address: tokenAddress,
              abi: optionsErc20Abi,
              functionName: "balanceOf",
              args: [address],
            }),
            publicClient.readContract({
              address: tokenAddress,
              abi: optionsErc20Abi,
              functionName: "allowance",
              args: [address, marketAddress],
            }),
          ])
        : [undefined, undefined];

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
        walletCollateralBalance,
        premiumAllowance,
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
      } else {
        setPosition(undefined);
      }
    } catch {
      setReadState(undefined);
      setPosition(undefined);
      setError("Robinhood Testnet RPC read failed. Live contract state is unavailable; no on-chain result is inferred.");
    } finally {
      setIsLoading(false);
    }
  }, [address, collateralVaultAddress, marketAddress, optionId, publicClient, rateIndexAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getQuote = useCallback(async (input: {
    kind: OptionsKind;
    strike: bigint;
    expiry: bigint;
    notional: bigint;
  }) => {
    if (!publicClient || !marketAddress) throw new OptionsActionError("Yield Rate Options is not deployed on Testnet.");
    if (input.notional <= BigInt(0)) throw new OptionsActionError("Enter a notional greater than zero.");
    const values = await publicClient.readContract({
      address: marketAddress,
      abi: optionsMarketAbi,
      functionName: "quote",
      args: [kindValue(input.kind), input.strike, input.expiry, input.notional],
    });
    const nextQuote: OptionsQuote = {
      kind: input.kind,
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

  const clearQuote = useCallback(() => setQuote(undefined), []);

  const approvePremium = useCallback(async (amount: bigint): Promise<Hex> => {
    if (!walletClient || !publicClient || !address || !marketAddress || chainId !== OPTIONS_TESTNET_CHAIN_ID || !readState) {
      throw new OptionsActionError("Connect a wallet on Robinhood Chain Testnet (46630) first.");
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
      await requireSuccessfulReceipt(publicClient, hash);
      await refresh();
      return hash;
    } catch (writeError) {
      if (writeError instanceof OptionsTransactionRevertedError) throw writeError;
      throw new Error(optionsErrorMessage(writeError));
    } finally {
      setIsPending(false);
    }
  }, [address, chainId, marketAddress, publicClient, readState, refresh, walletClient]);

  const openOption = useCallback(async (input: {
    kind: OptionsKind;
    strike: bigint;
    expiry: bigint;
    notional: bigint;
    maximumPremium: bigint;
    deadline: bigint;
  }): Promise<Hex> => {
    if (!walletClient || !publicClient || !address || !marketAddress || !collateralVaultAddress || !readState || chainId !== OPTIONS_TESTNET_CHAIN_ID) {
      throw new OptionsActionError("Connect a wallet on Robinhood Chain Testnet (46630) first.");
    }
    setIsPending(true);
    try {
      const [freshQuote, walletBalance, allowance, capacity] = await Promise.all([
        publicClient.readContract({
          address: marketAddress,
          abi: optionsMarketAbi,
          functionName: "quote",
          args: [kindValue(input.kind), input.strike, input.expiry, input.notional],
        }),
        publicClient.readContract({
          address: readState.collateralToken,
          abi: optionsErc20Abi,
          functionName: "balanceOf",
          args: [address],
        }),
        publicClient.readContract({
          address: readState.collateralToken,
          abi: optionsErc20Abi,
          functionName: "allowance",
          args: [address, marketAddress],
        }),
        publicClient.readContract({
          address: collateralVaultAddress,
          abi: optionsVaultAbi,
          functionName: "availableCollateral",
        }),
      ]);
      if (!freshQuote[4]) throw new OptionsActionError("The Testnet development rate index is stale.");
      if (freshQuote[0] > input.maximumPremium) throw new OptionsActionError("The quote changed. Request a fresh quote before opening.");
      if (walletBalance < freshQuote[0]) throw new OptionsActionError("Insufficient yDEVUSD balance for the quoted premium.");
      if (allowance < freshQuote[0]) throw new OptionsActionError("Approve the quoted premium before opening this option.");
      if (capacity < input.notional) throw new OptionsActionError("The collateral vault lacks capacity for this notional.");

      const hash = await walletClient.writeContract({
        account: address,
        address: marketAddress,
        abi: optionsMarketAbi,
        functionName: "openOption",
        args: [kindValue(input.kind), input.strike, input.expiry, input.notional, input.maximumPremium, input.deadline],
        chain: robinhoodChainTestnet,
      });
      const receipt = await requireSuccessfulReceipt(publicClient, hash);
      const openedLog = receipt.logs.find(
        (log) => log.address.toLowerCase() === marketAddress.toLowerCase()
          && log.topics[0] === optionOpenedEventTopic,
      );
      if (openedLog) {
        const decoded = decodeEventLog({
          abi: [optionOpenedEvent],
          data: openedLog.data,
          topics: openedLog.topics,
        });
        setLastOpenedOptionId(decoded.args.optionId);
      }
      await refresh();
      return hash;
    } catch (writeError) {
      if (writeError instanceof OptionsActionError || writeError instanceof OptionsTransactionRevertedError) throw writeError;
      throw new Error(optionsErrorMessage(writeError));
    } finally {
      setIsPending(false);
    }
  }, [address, chainId, collateralVaultAddress, marketAddress, publicClient, readState, refresh, walletClient]);

  const settleOption = useCallback(async (): Promise<Hex> => {
    if (!walletClient || !publicClient || !address || !marketAddress || chainId !== OPTIONS_TESTNET_CHAIN_ID || optionId === undefined) {
      throw new OptionsActionError("Connect a wallet on Robinhood Chain Testnet (46630) first.");
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
      await requireSuccessfulReceipt(publicClient, hash);
      await refresh();
      return hash;
    } catch (writeError) {
      if (writeError instanceof OptionsTransactionRevertedError) throw writeError;
      throw new Error(optionsErrorMessage(writeError));
    } finally {
      setIsPending(false);
    }
  }, [address, chainId, marketAddress, optionId, publicClient, refresh, walletClient]);

  const claimOption = useCallback(async (): Promise<Hex> => {
    if (!walletClient || !publicClient || !address || !marketAddress || chainId !== OPTIONS_TESTNET_CHAIN_ID || optionId === undefined) {
      throw new OptionsActionError("Connect the position owner on Robinhood Chain Testnet (46630) first.");
    }
    setIsPending(true);
    try {
      const values = await publicClient.readContract({
        address: marketAddress,
        abi: optionsMarketAbi,
        functionName: "options",
        args: [optionId],
      });
      if (values[0].toLowerCase() !== address.toLowerCase()) {
        throw new OptionsActionError("Only the on-chain position owner can claim this payout.");
      }
      if (Number(values[2]) !== 1) throw new OptionsActionError("This option has not been settled yet.");
      const hash = await walletClient.writeContract({
        account: address,
        address: marketAddress,
        abi: optionsMarketAbi,
        functionName: "claim",
        args: [optionId],
        chain: robinhoodChainTestnet,
      });
      await requireSuccessfulReceipt(publicClient, hash);
      await refresh();
      return hash;
    } catch (writeError) {
      if (writeError instanceof OptionsActionError || writeError instanceof OptionsTransactionRevertedError) throw writeError;
      throw new Error(optionsErrorMessage(writeError));
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
    lastOpenedOptionId,
    position,
    isLoading,
    isPending,
    error,
    refresh,
    getQuote,
    clearQuote,
    approvePremium,
    openOption,
    settleOption,
    claimOption,
    formatCollateral: (value: bigint) => readState ? formatUnits(value, readState.collateralDecimals) : "—",
    parseCollateral: (value: string) => readState ? parseUnits(value || "0", readState.collateralDecimals) : BigInt(0),
    parseRatePercent: (value: string) => parseUnits(value || "0", 16),
  };
}
