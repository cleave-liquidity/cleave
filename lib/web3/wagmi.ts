import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { robinhoodChain, robinhoodChainTestnet } from "./chains";

export const config = getDefaultConfig({
  appName: "CLEAVE",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
  chains: [robinhoodChain, robinhoodChainTestnet],
  ssr: true,
});
