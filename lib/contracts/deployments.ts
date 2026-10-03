import type { RobinhoodChainId, RobinhoodNetwork } from "@/types/market";
import { projectContractDeployments } from "./project-deployments";

export type ContractChainId = RobinhoodChainId;

export type ContractCategory =
  | "core"
  | "integration"
  | "risk"
  | "execution"
  | "read"
  | "market"
  | "router"
  | "pt"
  | "yt"
  | "adapter"
  | "quote"
  | "other";

export type ContractDeployment = {
  id: string;
  name: string;
  description?: string;
  chainId: ContractChainId;
  category: ContractCategory;
  address: `0x${string}`;
  version?: string;
  verified: boolean;
  ownership?: "external" | "project";
  explorerUrl?: string;
  source?: string;
  usedByRuntime: boolean;
  runtimeRole: string;
  deploymentTx?: `0x${string}`;
  deploymentBlock?: number;
  deployer?: `0x${string}`;
  gasUsed?: string;
  verificationStatus?: "VERIFIED" | "DEPLOYED / NOT VERIFIED";
};

export const contractDeployments: Readonly<Record<ContractChainId, readonly ContractDeployment[]>> = {
  4663: [
    {
      id: "pendle-router-v2",
      name: "Pendle Router V2",
      description: "External Pendle Router V2 deployment used by the official Convert API.",
      chainId: 4663,
      category: "router",
      address: "0x888888888889758F76e7103c6CbF23ABbF58F946",
      version: "v2",
      verified: true,
      ownership: "external",
      explorerUrl: "https://robinhoodchain.blockscout.com/address/0x888888888889758F76e7103c6CbF23ABbF58F946",
      source: "https://github.com/pendle-finance/pendle-core-v2-public/blob/main/deployments/4663-core.json",
      usedByRuntime: true,
      runtimeRole: "Quote route target, approval spender, and transaction target.",
    },
    {
      id: "pendle-router-static-v2",
      name: "Pendle Router Static V2",
      description: "External Pendle static quote helper deployment.",
      chainId: 4663,
      category: "quote",
      address: "0x6813d43782395A1F2AAb42f39aeEDE03ac655e09",
      version: "v2",
      verified: true,
      ownership: "external",
      explorerUrl: "https://robinhoodchain.blockscout.com/address/0x6813d43782395A1F2AAb42f39aeEDE03ac655e09",
      source: "https://github.com/pendle-finance/pendle-core-v2-public/blob/main/deployments/4663-core.json",
      usedByRuntime: false,
      runtimeRole: "Verified registry record; the current adapter does not call it directly.",
    },
    {
      id: "pendle-market-factory-v6",
      name: "Pendle Market Factory V6",
      description: "External Pendle market factory deployment.",
      chainId: 4663,
      category: "market",
      address: "0x544BF81c855AE84c1e8b65d5E38770898D01EeE2",
      version: "v6",
      verified: true,
      ownership: "external",
      explorerUrl: "https://robinhoodchain.blockscout.com/address/0x544BF81c855AE84c1e8b65d5E38770898D01EeE2",
      source: "https://github.com/pendle-finance/pendle-core-v2-public/blob/main/deployments/4663-core.json",
      usedByRuntime: false,
      runtimeRole: "Verified registry record; market discovery comes from Pendle live metadata.",
    },
    {
      id: "pendle-yield-contract-factory-v6",
      name: "Pendle Yield Contract Factory V6",
      description: "External Pendle PT/YT factory deployment.",
      chainId: 4663,
      category: "other",
      address: "0xa543BF1ac6441822E95eD408076bB53090a0a9d7",
      version: "v6",
      verified: true,
      ownership: "external",
      explorerUrl: "https://robinhoodchain.blockscout.com/address/0xa543BF1ac6441822E95eD408076bB53090a0a9d7",
      source: "https://github.com/pendle-finance/pendle-core-v2-public/blob/main/deployments/4663-core.json",
      usedByRuntime: false,
      runtimeRole: "Verified registry record; PT/YT addresses come from live market metadata.",
    },
    {
      id: "pendle-sy-factory",
      name: "Pendle SY Factory",
      description: "External Pendle standard-yield factory deployment.",
      chainId: 4663,
      category: "other",
      address: "0x466CeD3b33045Ea986B2f306C8D0aA8067961CF8",
      version: "v6",
      verified: true,
      ownership: "external",
      explorerUrl: "https://robinhoodchain.blockscout.com/address/0x466CeD3b33045Ea986B2f306C8D0aA8067961CF8",
      source: "https://github.com/pendle-finance/pendle-core-v2-public/blob/main/deployments/4663-core.json",
      usedByRuntime: false,
      runtimeRole: "Verified registry record; SY addresses come from live market metadata.",
    },
  ],
  46630: [],
};

export function getContractChainId(network: RobinhoodNetwork): ContractChainId {
  return network === "mainnet" ? 4663 : 46630;
}

export function getContractDeployments(network: RobinhoodNetwork): readonly ContractDeployment[] {
  const chainId = getContractChainId(network);
  return [...contractDeployments[chainId], ...projectContractDeployments[chainId]];
}

export function getContractsForChain(chainId: ContractChainId): readonly ContractDeployment[] {
  return [...contractDeployments[chainId], ...projectContractDeployments[chainId]];
}

export function getContractByName(
  chainId: ContractChainId,
  name: string,
): ContractDeployment | undefined {
  return getContractsForChain(chainId).find(
    (deployment) => deployment.name.toLowerCase() === name.trim().toLowerCase(),
  );
}
