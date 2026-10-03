import type { ContractChainId, ContractDeployment } from "./deployments";

/** Generated from the verified Foundry Testnet broadcast. */
export const projectContractDeployments: Readonly<Record<ContractChainId, readonly ContractDeployment[]>> = {
  4663: [],
  46630: [{
  "id": "cleave-registry-testnet",
  "name": "CleaveRegistry",
  "description": "CLEAVE-owned configuration anchor for approved external Pendle references; it does not custody funds or execute trades.",
  "chainId": 46630,
  "category": "other",
  "address": "0xa5d21b39258da11152a0e63135936b1e60acfe43",
  "verified": true,
  "ownership": "project",
  "explorerUrl": "https://explorer.testnet.chain.robinhood.com/address/0xa5d21b39258da11152a0e63135936b1e60acfe43",
  "usedByRuntime": false,
  "runtimeRole": "Registry-only configuration anchor; not part of the Pendle trade execution path.",
  "deploymentTx": "0x4f6105364c255044b1bf4f0e6e92aa204c560ba9ac3107a7f7b38184ad3380ff",
  "deploymentBlock": 128282341,
  "deployer": "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
  "gasUsed": "321865",
  "verificationStatus": "VERIFIED"
}],
};

export function getProjectContractDeployments(
  chainId: ContractChainId,
): readonly ContractDeployment[] {
  return projectContractDeployments[chainId];
}
