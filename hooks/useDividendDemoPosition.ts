"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, type Address, type Hex } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import {
  dividendAccountingAbi,
  dividendLensAbi,
  getDividendDeployment,
  type DividendLensState,
} from "@/lib/dividend/dividend-contract";
import {
  dividendDemoAccountingAbi,
  dividendDemoPositionId,
  dividendDemoRegistryAbi,
  dividendDemoTokenAbi,
  dividendProcessedEvent,
  DIVIDEND_DEMO_MARKET_ID,
  getDividendDemoTokenAddress,
} from "@/lib/dividend/dividend-demo-contract";
import { ROBINHOOD_TESTNET_CHAIN_ID } from "@/lib/web3/chains";

type DemoPosition = {
  marketId: Hex;
  owner: Address;
  exposureBaseUnits: bigint;
  lastIndex: bigint;
  accruedBaseUnits: bigint;
  openedAt: bigint;
  enabled: boolean;
  closed: boolean;
};

type DemoMarket = {
  underlying: Address;
  sourceAdapter: Address;
  protocolFeeBps: number;
  lastRateBaseUnits: bigint;
  lastRateDecimals: number;
  lastEventId: Hex;
  lastEventTimestamp: bigint;
  lastSequence: bigint;
  enabled: boolean;
  paused: boolean;
};

type DemoAccountingMarket = {
  index: bigint;
  exposureDecimals: number;
  rewardDecimals: number;
  enabled: boolean;
};

export type DividendDemoSnapshot = {
  token: Address;
  accounting: Address;
  owner: Address;
  positionId: Hex;
  tokenName: string;
  tokenSymbol: string;
  exposureBaseUnits: bigint;
  position: DemoPosition;
  market: DemoMarket;
  accountingMarket: DemoAccountingMarket;
  lens: DividendLensState;
  verified: boolean;
};

function errorMessage(error: unknown): string {
  const candidate = error as { shortMessage?: string; message?: string; cause?: { code?: number; message?: string } };
  const code = candidate?.cause?.code;
  const message = candidate?.shortMessage || candidate?.cause?.message || candidate?.message || "";
  if (code === 4001 || /user rejected|denied transaction|rejected the request/i.test(message)) {
    return "Wallet confirmation was rejected. No transaction was sent.";
  }
  if (/insufficient funds|gas required exceeds allowance/i.test(message)) {
    return "The connected Testnet wallet needs native gas to submit this transaction.";
  }
  if (/chain|network/i.test(message)) {
    return "Switch the connected wallet to Robinhood Chain Testnet (46630).";
  }
  return message || "The Testnet read or wallet request failed. Try refreshing the on-chain state.";
}

export function useDividendDemoPosition() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: ROBINHOOD_TESTNET_CHAIN_ID });
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync, isPending: isSwitchPending } = useSwitchChain();
  const deployment = useMemo(() => getDividendDeployment(ROBINHOOD_TESTNET_CHAIN_ID), []);
  const token = useMemo(() => getDividendDemoTokenAddress(), []);
  const [snapshot, setSnapshot] = useState<DividendDemoSnapshot>();
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();
  const [enableTxHash, setEnableTxHash] = useState<Hex>();
  const [eventTxHash, setEventTxHash] = useState<Hex>();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => setIsHydrated(true), []);

  const readOnChain = useCallback(async (): Promise<DividendDemoSnapshot> => {
    if (!publicClient || !deployment || !token) {
      throw new Error("The Testnet demo token and Dividend deployments are not configured in this staging environment.");
    }
    const bytecode = await publicClient.getBytecode({ address: token });
    if (!bytecode || bytecode === "0x") throw new Error("The configured development token has no Testnet bytecode.");

    const accountingAddress = deployment.accounting || await publicClient.readContract({
      address: deployment.registry,
      abi: dividendDemoRegistryAbi,
      functionName: "accounting",
    });
    const [developmentOnly, owner, tokenName, tokenSymbol, totalSupply] = await Promise.all([
      publicClient.readContract({ address: token, abi: dividendDemoTokenAbi, functionName: "developmentOnly" }),
      publicClient.readContract({ address: token, abi: dividendDemoTokenAbi, functionName: "designatedWallet" }),
      publicClient.readContract({ address: token, abi: dividendDemoTokenAbi, functionName: "name" }),
      publicClient.readContract({ address: token, abi: dividendDemoTokenAbi, functionName: "symbol" }),
      publicClient.readContract({ address: token, abi: dividendDemoTokenAbi, functionName: "totalSupply" }),
    ]);
    if (!developmentOnly) throw new Error("The configured token is not marked development-only.");
    const positionId = dividendDemoPositionId(owner, token);
    const [marketResult, accountingMarketResult, positionResult, balance, lensResult] = await Promise.all([
      publicClient.readContract({ address: deployment.registry, abi: dividendDemoRegistryAbi, functionName: "getMarket", args: [DIVIDEND_DEMO_MARKET_ID] }),
      publicClient.readContract({ address: accountingAddress, abi: dividendDemoAccountingAbi, functionName: "markets", args: [DIVIDEND_DEMO_MARKET_ID] }),
      publicClient.readContract({ address: accountingAddress, abi: dividendDemoAccountingAbi, functionName: "getPosition", args: [positionId] }),
      publicClient.readContract({ address: token, abi: dividendDemoTokenAbi, functionName: "balanceOf", args: [owner] }),
      publicClient.readContract({ address: deployment.lens, abi: dividendLensAbi, functionName: "dividendState", args: [DIVIDEND_DEMO_MARKET_ID, positionId] }),
    ]);
    const market = marketResult as unknown as DemoMarket;
    const [accountingIndex, exposureDecimals, rewardDecimals, accountingEnabled] =
      accountingMarketResult as readonly [bigint, number, number, boolean];
    const accountingMarket: DemoAccountingMarket = {
      index: accountingIndex,
      exposureDecimals,
      rewardDecimals,
      enabled: accountingEnabled,
    };
    const position = positionResult as unknown as DemoPosition;
    const lens = lensResult as unknown as DividendLensState;
    const verified = Boolean(
      market.underlying.toLowerCase() === token.toLowerCase() &&
      market.sourceAdapter.toLowerCase() === token.toLowerCase() &&
      market.enabled && !market.paused && market.protocolFeeBps === 0 &&
      accountingMarket.enabled && accountingMarket.exposureDecimals === 18 &&
      accountingMarket.rewardDecimals === 6 && position.owner.toLowerCase() === owner.toLowerCase() &&
      position.marketId.toLowerCase() === DIVIDEND_DEMO_MARKET_ID.toLowerCase() &&
      position.exposureBaseUnits > BigInt(0) && position.exposureBaseUnits === balance && balance === totalSupply &&
      !position.closed && lens.eligible && !lens.settlementEnabled
    );
    if (!verified) {
      throw new Error("No matching authorized development position is registered yet, or its on-chain exposure/configuration does not match the fixed demo token.");
    }
    const result: DividendDemoSnapshot = {
      token,
      accounting: accountingAddress,
      owner,
      positionId,
      tokenName,
      tokenSymbol,
      exposureBaseUnits: balance,
      position,
      market,
      accountingMarket,
      lens,
      verified,
    };

    setEventTxHash(undefined);
    const startBlockRaw = process.env.NEXT_PUBLIC_YELTRA_DIVIDEND_DEMO_START_BLOCK_TESTNET?.trim();
    if (lens.lastEventId !== `0x${"0".repeat(64)}` && startBlockRaw && /^\d+$/.test(startBlockRaw)) {
      try {
        const logs = await publicClient.getLogs({
          address: deployment.registry,
          event: dividendProcessedEvent,
          args: { marketId: DIVIDEND_DEMO_MARKET_ID, eventId: lens.lastEventId },
          fromBlock: BigInt(startBlockRaw),
          toBlock: "latest",
        });
        const lastLog = logs.at(-1);
        if (lastLog?.transactionHash) setEventTxHash(lastLog.transactionHash);
      } catch {
        // Lens remains authoritative for the event ID and accrual if an RPC limits log ranges.
      }
    }
    return result;
  }, [deployment, publicClient, token]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const current = await readOnChain();
      setSnapshot(current);
      return current;
    } catch (readError) {
      setSnapshot(undefined);
      setError(errorMessage(readError));
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [readOnChain]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchToTestnet = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: ROBINHOOD_TESTNET_CHAIN_ID });
      setError(undefined);
    } catch (switchError) {
      setError(errorMessage(switchError));
    }
  }, [switchChainAsync]);

  const enable = useCallback(async () => {
    if (!isConnected || !address || !walletClient || !publicClient || !snapshot?.verified) {
      throw new Error("Connect the designated development position owner wallet before enabling.");
    }
    if (chainId !== ROBINHOOD_TESTNET_CHAIN_ID || walletClient.chain.id !== ROBINHOOD_TESTNET_CHAIN_ID) {
      throw new Error("Switch the connected wallet to Robinhood Chain Testnet (46630).");
    }
    if (address.toLowerCase() !== snapshot.owner.toLowerCase()) {
      throw new Error("Only the registered development position owner can enable Dividend Earn.");
    }
    const current = await readOnChain();
    if (!current.verified || current.position.owner.toLowerCase() !== address.toLowerCase()) {
      throw new Error("On-chain ownership or position verification failed. No transaction was sent.");
    }
    if (current.position.enabled || current.lens.enabled) throw new Error("Dividend Earn is already enabled for this position.");

    setIsPending(true);
    setError(undefined);
    try {
      const hash = await walletClient.writeContract({
        account: address,
        address: current.accounting,
        abi: dividendAccountingAbi,
        functionName: "enablePosition",
        args: [current.positionId, true],
        chain: walletClient.chain,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The wallet transaction was mined but reverted. Dividend Earn remains unchanged.");
      setEnableTxHash(hash);
      const updated = await readOnChain();
      if (!updated.position.enabled || !updated.lens.enabled) {
        throw new Error("Transaction confirmed, but the refreshed on-chain state is not enabled. Refresh before continuing.");
      }
      setSnapshot(updated);
      return hash;
    } catch (writeError) {
      const message = errorMessage(writeError);
      setError(message);
      throw new Error(message);
    } finally {
      setIsPending(false);
    }
  }, [address, chainId, isConnected, publicClient, readOnChain, snapshot, walletClient]);

  return {
    snapshot,
    error,
    isLoading,
    isPending,
    isSwitchPending,
    isHydrated,
    address,
    chainId,
    isConnected,
    enableTxHash,
    eventTxHash,
    refresh,
    enable,
    switchToTestnet,
    formatExposure: (value: bigint, decimals: number) => formatUnits(value, decimals),
  };
}
