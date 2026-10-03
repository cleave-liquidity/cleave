import type { ContractChainId, ContractDeployment } from "./deployments";

/**
 * Generated from contracts/broadcast/Deploy.s.sol/<chain-id>/run-latest.json.
 * Keep empty until a real CLEAVE deployment has been broadcast and synchronized.
 */
export const projectContractDeployments: Readonly<Record<ContractChainId, readonly ContractDeployment[]>> = {
  4663: [],
  46630: [],
};

export function getProjectContractDeployments(
  chainId: ContractChainId,
): readonly ContractDeployment[] {
  return projectContractDeployments[chainId];
}
