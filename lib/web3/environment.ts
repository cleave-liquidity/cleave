import type { MarketDataMode, RobinhoodNetwork } from "@/types/market";
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_TESTNET_CHAIN_ID,
  getRobinhoodNetwork,
} from "@/lib/web3/chains";

export function getConfiguredNetwork(): RobinhoodNetwork {
  return process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV === "testnet"
    ? "testnet"
    : "mainnet";
}

export interface RuntimeEnvironmentValidation {
  browseNetwork: RobinhoodNetwork;
  browseChainId: typeof ROBINHOOD_CHAIN_ID | typeof ROBINHOOD_TESTNET_CHAIN_ID;
  dataMode: MarketDataMode;
  mainnetRpcConfigured: boolean;
  testnetRpcConfigured: boolean;
  walletConnectProjectIdValid: boolean;
  productionReady: boolean;
}

function isPublicHttpUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getWalletConnectProjectId(): string | undefined {
  const value = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
  return value && /^[a-f0-9]{32}$/i.test(value) ? value : undefined;
}

export function getRuntimeEnvironmentValidation(): RuntimeEnvironmentValidation {
  const browseNetwork = getConfiguredNetwork();
  const browseChainId = getConfiguredChainId();
  const dataMode: MarketDataMode = process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE === "mock" ? "mock" : "live";
  const mainnetRpcConfigured = isPublicHttpUrl(process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL);
  const testnetRpcConfigured = isPublicHttpUrl(process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL);
  const walletConnectProjectIdValid = getWalletConnectProjectId() !== undefined;

  return {
    browseNetwork,
    browseChainId,
    dataMode,
    mainnetRpcConfigured,
    testnetRpcConfigured,
    walletConnectProjectIdValid,
    productionReady:
      browseNetwork === "mainnet" &&
      dataMode === "live" &&
      mainnetRpcConfigured &&
      walletConnectProjectIdValid,
  };
}

export function getConfiguredChainId():
  | typeof ROBINHOOD_CHAIN_ID
  | typeof ROBINHOOD_TESTNET_CHAIN_ID {
  return getConfiguredNetwork() === "mainnet"
    ? ROBINHOOD_CHAIN_ID
    : ROBINHOOD_TESTNET_CHAIN_ID;
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
