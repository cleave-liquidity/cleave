import { defineChain } from "viem";

export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_TESTNET_CHAIN_ID = 46630;
export const ROBINHOOD_CHAIN_IDS = [
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_TESTNET_CHAIN_ID,
] as const;

const mainnetRpcUrl = process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL;
const testnetRpcUrl = process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL;

export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        ...(mainnetRpcUrl ? [mainnetRpcUrl] : []),
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Explorer",
      url: "https://explorer.robinhoodchain.org",
    },
  },
});

export const robinhoodChainTestnet = defineChain({
  id: ROBINHOOD_TESTNET_CHAIN_ID,
  name: "Robinhood Chain Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        ...(testnetRpcUrl ? [testnetRpcUrl] : []),
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Testnet Explorer",
      url: "https://testnet-explorer.robinhoodchain.org",
    },
  },
  testnet: true,
});

export const supportedChains = [robinhoodChain, robinhoodChainTestnet] as const;

export function isSupportedRobinhoodChain(chainId?: number): boolean {
  return chainId === ROBINHOOD_CHAIN_ID || chainId === ROBINHOOD_TESTNET_CHAIN_ID;
}
