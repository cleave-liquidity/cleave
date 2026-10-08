"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import type { Address } from "viem";
import type { LongYieldPosition } from "@/types/position";
import {
  dividendAccountingAbi,
  dividendAccountingMarketAbi,
  dividendAccountingPositionAbi,
  dividendLensAbi,
  dividendMarketId,
  dividendPositionId,
  dividendRegistryAbi,
  getDividendDeployment,
  type DividendLensState,
} from "@/lib/dividend/dividend-contract";

type DividendPositionReference = Pick<LongYieldPosition, "id" | "owner" | "marketId">;

export function useDividendEarn(position?: DividendPositionReference) {
  const { address, chainId } = useAccount();
  const parsedPositionChainId = position ? Number(position.id.split(":")[1]) : undefined;
  const targetChainId = (parsedPositionChainId === 4663 || parsedPositionChainId === 46630
    ? parsedPositionChainId
    : chainId) as 4663 | 46630 | undefined;
  const publicClient = usePublicClient(
    targetChainId ? { chainId: targetChainId } : undefined,
  );
  const { data: walletClient } = useWalletClient();
  const deployment = useMemo(
    () => getDividendDeployment(targetChainId || 0),
    [targetChainId],
  );
  const networkMatches = !position || chainId === targetChainId;
  const ownerMatches =
    !position ||
    (Boolean(address) && address?.toLowerCase() === position.owner.toLowerCase());
  const marketId = position && targetChainId
    ? dividendMarketId(position.marketId, targetChainId)
    : undefined;
  const positionId = position ? dividendPositionId(position.id) : undefined;
  const [state, setState] = useState<DividendLensState>();
  const [accountingAddress, setAccountingAddress] = useState<Address>();
  const [rewardDecimals, setRewardDecimals] = useState<number>();
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (
      !publicClient ||
      !deployment ||
      !marketId ||
      !positionId ||
      !ownerMatches
    ) {
      setState(undefined);
      setAccountingAddress(undefined);
      setRewardDecimals(undefined);
      if (!deployment) setError("DIVIDEND_REGISTRY_NOT_CONFIGURED");
      else if (!ownerMatches) setError("POSITION_OWNER_MISMATCH");
      else setError(undefined);
      return;
    }
    setIsLoading(true);
    setError(undefined);
    try {
      const resolvedAccounting =
        deployment.accounting ||
        (await publicClient.readContract({
          address: deployment.registry,
          abi: dividendRegistryAbi,
          functionName: "accounting",
        }));
      setAccountingAddress(resolvedAccounting);
      const accountingMarket = await publicClient.readContract({
        address: resolvedAccounting,
        abi: dividendAccountingMarketAbi,
        functionName: "markets",
        args: [marketId],
      });
      if (!accountingMarket[3]) {
        setState(undefined);
        setRewardDecimals(undefined);
        setError("DIVIDEND_MARKET_NOT_ENABLED");
        return;
      }
      setRewardDecimals(accountingMarket[2]);
      const ledgerPosition = await publicClient.readContract({
        address: resolvedAccounting,
        abi: dividendAccountingPositionAbi,
        functionName: "getPosition",
        args: [positionId],
      });
      if (
        !address ||
        ledgerPosition.owner.toLowerCase() !== address.toLowerCase() ||
        ledgerPosition.marketId.toLowerCase() !== marketId.toLowerCase() ||
        ledgerPosition.exposureBaseUnits === BigInt(0) ||
        ledgerPosition.closed
      ) {
        setState(undefined);
        setError("POSITION_NOT_REGISTERED_OR_MISMATCHED");
        return;
      }
      const result = await publicClient.readContract({
        address: deployment.lens,
        abi: dividendLensAbi,
        functionName: "dividendState",
        args: [marketId, positionId],
      });
      setState(result as DividendLensState);
    } catch {
      // A position that has not been registered by the authorized updater is
      // intentionally not treated as eligible on-chain.
      setState(undefined);
      setError("POSITION_REGISTRATION_PENDING");
      setRewardDecimals(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [address, deployment, marketId, ownerMatches, positionId, publicClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (
      !walletClient ||
      !address ||
      !publicClient ||
      !deployment ||
      !accountingAddress ||
      !positionId ||
      !networkMatches ||
      !ownerMatches
    ) {
      throw new Error("Dividend Earn is not configured for this network or wallet.");
    }
    setIsPending(true);
    try {
      if (walletClient.chain?.id !== targetChainId) {
        throw new Error("Switch the connected wallet to the position network before enabling.");
      }
      const hash = await walletClient.writeContract({
        account: address,
        address: accountingAddress,
        abi: dividendAccountingAbi,
        functionName: "enablePosition",
        args: [positionId, true],
        chain: walletClient.chain,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("The Dividend Earn transaction reverted.");
      }
      await refresh();
      return hash;
    } finally {
      setIsPending(false);
    }
  }, [
    accountingAddress,
    address,
    deployment,
    networkMatches,
    ownerMatches,
    positionId,
    publicClient,
    refresh,
    targetChainId,
    walletClient,
  ]);

  return {
    configured: Boolean(deployment),
    accounting: accountingAddress,
    rewardDecimals,
    networkMatches,
    ownerMatches,
    registered: Boolean(state),
    state,
    isLoading,
    isPending,
    error,
    enable,
    refresh,
  };
}
