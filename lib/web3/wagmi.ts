import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { robinhoodChain, robinhoodChainTestnet } from "./chains";

const WALLET_CONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID &&
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.trim().length > 0
    ? process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    : "3a8170812b534d0ff9d794f19a901d64";

export const config = getDefaultConfig({
  appName: "CLEAVE",
  projectId: WALLET_CONNECT_PROJECT_ID,
  chains: [robinhoodChain, robinhoodChainTestnet],
  ssr: true,
});
