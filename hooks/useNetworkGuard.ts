"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { isSupportedRobinhoodChain } from "@/lib/web3/chains";
import { getConfiguredChainId } from "@/lib/web3/environment";
import { YieldDomainError } from "@/types/errors";
import type { RobinhoodChainId } from "@/types/market";

export type NetworkGuardStatus = "disconnected" | "unsupported-chain" | "switching-chain" | "ready";

export function useNetworkGuard() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const status: NetworkGuardStatus = !isConnected
    ? "disconnected"
    : isPending
      ? "switching-chain"
      : isSupportedRobinhoodChain(chainId)
        ? "ready"
        : "unsupported-chain";

  /** Switches to the chain a market lives on (defaults to the configured network). */
  const switchToRobinhood = async (targetChainId: RobinhoodChainId = getConfiguredChainId()) => {
    if (!switchChainAsync) {
      throw new YieldDomainError(
        "network-switch-failed",
        "Your wallet cannot switch networks automatically. Switch to Robinhood Chain manually."
      );
    }
    await switchChainAsync({ chainId: targetChainId });
  };

  return {
    address,
    isConnected,
    chainId,
    status,
    isReady: status === "ready",
    switchToRobinhood,
  };
}
