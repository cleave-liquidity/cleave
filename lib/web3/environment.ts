import type { RobinhoodNetwork } from "@/types/market";
import { getRobinhoodNetwork } from "@/lib/web3/chains";

export function getConfiguredNetwork(): RobinhoodNetwork {
  return process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV === "mainnet"
    ? "mainnet"
    : "testnet";
}

export function getNetworkLabel(
  chainId?: number,
  isConnected = false,
): string {
  if (isConnected) {
    const network = getRobinhoodNetwork(chainId);
    if (!network) return "Wrong Network";
    return network === "mainnet"
      ? "Robinhood Chain Mainnet"
      : "Robinhood Chain Testnet";
  }

  return getConfiguredNetwork() === "mainnet"
    ? "Default · Robinhood Chain Mainnet"
    : "Default · Robinhood Chain Testnet";
}

export function getNetworkShortLabel(
  chainId?: number,
  isConnected = false,
): string {
  if (isConnected && !getRobinhoodNetwork(chainId)) return "Wrong Network";
  const network = isConnected ? getRobinhoodNetwork(chainId) : getConfiguredNetwork();
  return network === "mainnet" ? "Mainnet" : "Testnet";
}
