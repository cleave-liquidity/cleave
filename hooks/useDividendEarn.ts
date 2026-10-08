"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import type { Address } from "viem";
import type { LongYieldPosition } from "@/types/position";
import {
  dividendAccountingAbi,
  dividendLensAbi,
  dividendMarketId,
  dividendPositionId,
  dividendRegistryAbi,
  getDividendDeployment,
  type DividendLensState,
} from "@/lib/dividend/dividend-contract";

export function useDividendEarn(position?: LongYieldPosition) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const parsedPositionChainId = position ? Number(position.id.split(":")[1]) : undefined;
  const targetChainId = parsedPositionChainId === 4663 || parsedPositionChainId === 46630
    ? parsedPositionChainId
    : chainId || 0;
  const deployment = getDividendDeployment(targetChainId);
  const networkMatches = !position || chainId === targetChainId;
  const ownerMatches =
    !position ||
    (Boolean(address) && address?.toLowerCase() === position.owner.toLowerCase());
  const marketId = position && networkMatches
    ? dividendMarketId(position.marketId, targetChainId)
    : undefined;
  const positionId = position ? dividendPositionId(position.id) : undefined;
  const [state, setState] = useState<DividendLensState>();
  const [accountingAddress, setAccountingAddress] = useState<Address>();
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (
      !publicClient ||
      !deployment ||
      !marketId ||
      !positionId ||
      !networkMatches ||
      !ownerMatches
    ) {
      setState(undefined);
      setAccountingAddress(undefined);
      if (!networkMatches) setError("POSITION_NETWORK_MISMATCH");
      else if (!ownerMatches) setError("POSITION_OWNER_MISMATCH");
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
    } finally {
      setIsLoading(false);
    }
  }, [deployment, marketId, networkMatches, ownerMatches, positionId, publicClient]);

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
      const hash = await walletClient.writeContract({
        account: address,
        address: accountingAddress,
        abi: dividendAccountingAbi,
        functionName: "enablePosition",
        args: [positionId, true],
        chain: walletClient.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
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
    walletClient,
  ]);

  return {
    configured: Boolean(deployment),
    accounting: accountingAddress,
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
