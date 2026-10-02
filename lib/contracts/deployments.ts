import type { RobinhoodChainId, RobinhoodNetwork } from "@/types/market";

export type ContractChainId = RobinhoodChainId;

export type ContractCategory =
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
  explorerUrl?: string;
  source?: string;
};

export const contractDeployments: Readonly<Record<ContractChainId, readonly ContractDeployment[]>> = {
  4663: [],
  46630: [],
};

export function getContractChainId(network: RobinhoodNetwork): ContractChainId {
  return network === "mainnet" ? 4663 : 46630;
}

export function getContractDeployments(network: RobinhoodNetwork): readonly ContractDeployment[] {
  return contractDeployments[getContractChainId(network)];
}

export function getContractsForChain(chainId: ContractChainId): readonly ContractDeployment[] {
  return contractDeployments[chainId];
}

export function getContractByName(
  chainId: ContractChainId,
  name: string,
): ContractDeployment | undefined {
  return getContractsForChain(chainId).find(
    (deployment) => deployment.name.toLowerCase() === name.trim().toLowerCase(),
  );
}
