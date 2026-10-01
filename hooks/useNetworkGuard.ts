"use client";

import { useAccount, useSwitchChain } from "wagmi";
import {
  ROBINHOOD_CHAIN_ID,
  isSupportedRobinhoodChain,
} from "@/lib/web3/chains";
import { YieldDomainError } from "@/types/errors";

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

  const switchToRobinhood = async () => {
    if (!switchChainAsync) {
      throw new YieldDomainError(
        "network-switch-failed",
        "Your wallet cannot switch networks automatically. Switch to Robinhood Chain manually."
      );
    }
    await switchChainAsync({ chainId: ROBINHOOD_CHAIN_ID });
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
