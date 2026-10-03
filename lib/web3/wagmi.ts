import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { custom, http, type Chain, type Transport } from "viem";
import { robinhoodChain, robinhoodChainTestnet } from "./chains";
import { getWalletConnectProjectId } from "./environment";

const WALLET_CONNECT_PROJECT_ID =
  getWalletConnectProjectId() ?? "3a8170812b534d0ff9d794f19a901d64";

/**
 * Transport for a chain. `http()` with no URL throws while the client is being *created*, which
 * leaves `usePublicClient()` undefined and crashes RainbowKit (and with it the whole page) whenever
 * a deployment has no RPC env var. Without a configured URL we use a transport that only fails when a
 * request is actually made, so the app renders and the failure surfaces as a normal RPC error.
 */
function transportFor(chain: Chain): Transport {
  const url = chain.rpcUrls.default.http[0];
  if (url) return http(url);
  return custom({
    async request() {
      throw new Error(`No RPC URL configured for ${chain.name}. Set the NEXT_PUBLIC_*_RPC_URL environment variable.`);
    },
  });
}

export const config = getDefaultConfig({
  appName: "CLEAVE",
  projectId: WALLET_CONNECT_PROJECT_ID,
  chains: [robinhoodChain, robinhoodChainTestnet],
  transports: {
    [robinhoodChain.id]: transportFor(robinhoodChain),
    [robinhoodChainTestnet.id]: transportFor(robinhoodChainTestnet),
  },
  ssr: true,
});
