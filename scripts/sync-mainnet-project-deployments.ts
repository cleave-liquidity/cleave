import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectContractDeployments } from "../lib/contracts/project-deployments";
import type { ContractDeployment } from "../lib/contracts/deployments";

const chainId = 4663;
const repoDir = process.cwd();
const outputPath = join(repoDir, "lib", "contracts", "project-deployments.ts");
const broadcastPath = join(repoDir, "contracts", "broadcast", "DeployMainnet.s.sol", String(chainId), "run-latest.json");

type JsonObject = Record<string, unknown>;

type ProjectEntry = ContractDeployment & {
  ownership: "project";
  usedByRuntime: false;
  verificationStatus: "VERIFIED" | "DEPLOYED / NOT VERIFIED";
};

type ContractMetadata = Pick<ProjectEntry, "id" | "name" | "category" | "description" | "runtimeRole">;

const metadata: readonly ContractMetadata[] = [
  {
    id: "cleave-access-manager-mainnet",
    name: "CleaveAccessManager",
    category: "core",
    description: "Central CLEAVE protocol role authority.",
    runtimeRole: "Shared admin, operator, and guardian authorization layer for CLEAVE modules.",
  },
  {
    id: "cleave-registry-mainnet",
    name: "CleaveRegistry",
    category: "core",
    description: "CLEAVE-owned configuration anchor.",
    runtimeRole: "Top-level CLEAVE discovery/configuration anchor; not part of the Pendle trade execution path.",
  },
  {
    id: "cleave-adapter-registry-mainnet",
    name: "CleaveAdapterRegistry",
    category: "integration",
    description: "Approved external yield protocol integration registry.",
    runtimeRole: "Registry-only external adapter configuration; no arbitrary protocol execution.",
  },
  {
    id: "cleave-market-registry-mainnet",
    name: "CleaveMarketRegistry",
    category: "integration",
    description: "Verified external market metadata registry.",
    runtimeRole: "Registry-only market, PT, YT, SY, underlying, maturity, and adapter metadata.",
  },
  {
    id: "cleave-risk-guard-mainnet",
    name: "CleaveRiskGuard",
    category: "risk",
    description: "Non-custodial global, market, and adapter pause controls.",
    runtimeRole: "Risk state consumed by the CLEAVE execution boundary.",
  },
  {
    id: "cleave-execution-router-mainnet",
    name: "CleaveExecutionRouter",
    category: "execution",
    description: "Validated CLEAVE execution boundary without arbitrary external calls.",
    runtimeRole: "Validates market, adapter, and risk state; current frontend Pendle execution remains direct.",
  },
  {
    id: "cleave-lifecycle-manager-mainnet",
    name: "CleaveLifecycleManager",
    category: "execution",
    description: "Fixed Yield and Trading Yield lifecycle eligibility rules.",
    runtimeRole: "Read-only sell, maturity, expiry, and yield-claim eligibility rules; no settlement or amount fabrication.",
  },
  {
    id: "cleave-lens-mainnet",
    name: "CleaveLens",
    category: "read",
    description: "Read-only aggregation layer for CLEAVE modules and market state.",
    runtimeRole: "Canonical combined read surface for frontend and deployment diagnostics.",
  },
];

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function asAddress(value: unknown, label: string): `0x${string}` {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`Broadcast metadata is missing a valid ${label}.`);
  }
  return value as `0x${string}`;
}

function asHash(value: unknown, label: string): `0x${string}` {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`Broadcast metadata is missing a valid ${label}.`);
  }
  return value as `0x${string}`;
}

function asBlock(value: unknown, label: string): number {
  const block = typeof value === "string" && value.startsWith("0x")
    ? Number.parseInt(value, 16)
    : typeof value === "string" || typeof value === "number"
      ? Number(value)
      : Number.NaN;
  if (!Number.isSafeInteger(block) || block < 0) throw new Error(`Broadcast metadata is missing a valid ${label}.`);
  return block;
}

function asQuantity(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  try {
    return BigInt(value).toString(10);
  } catch {
    throw new Error("Broadcast metadata contains an invalid gas-used quantity.");
  }
}

function readDeployment(
  broadcast: JsonObject,
  contract: ContractMetadata,
  verified: boolean,
): ProjectEntry {
  const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions.map(asObject) : [];
  const creation = transactions.find((transaction) =>
    transaction.transactionType === "CREATE" && transaction.contractName === contract.name,
  );
  if (!creation) throw new Error(`The Mainnet broadcast contains no ${contract.name} CREATE transaction.`);

  const deploymentTx = asHash(creation.hash, `${contract.name} deployment transaction hash`);
  const receipts = Array.isArray(broadcast.receipts) ? broadcast.receipts.map(asObject) : [];
  const receipt = receipts.find((candidate) => candidate.transactionHash === deploymentTx) ?? asObject(creation.receipt);
  if (receipt.status !== "0x1" && receipt.status !== "1") {
    throw new Error(`The ${contract.name} deployment receipt did not succeed.`);
  }

  const transaction = asObject(creation.transaction);
  const address = asAddress(creation.contractAddress, `${contract.name} address`);
  const deployerValue = transaction.from ?? receipt.from ?? creation.from;
  const deployer = deployerValue === undefined ? undefined : asAddress(deployerValue, `${contract.name} deployer address`);
  const deploymentBlock = asBlock(receipt.blockNumber ?? creation.blockNumber, `${contract.name} deployment block`);
  const gasUsed = asQuantity(receipt.gasUsed);

  return {
    ...contract,
    chainId,
    address,
    verified,
    ownership: "project",
    explorerUrl: `https://robinhoodchain.blockscout.com/address/${address}`,
    usedByRuntime: false,
    deploymentTx,
    deploymentBlock,
    ...(deployer ? { deployer } : {}),
    ...(gasUsed ? { gasUsed } : {}),
    verificationStatus: verified ? "VERIFIED" : "DEPLOYED / NOT VERIFIED",
  };
}

function main(): void {
  const broadcast = JSON.parse(readFileSync(broadcastPath, "utf8")) as JsonObject;
  if (Number(broadcast.chain) !== chainId) throw new Error("Refusing to sync a non-Mainnet broadcast.");

  // This is intentionally opt-in. A deployment is not source-verified merely because
  // its bytecode exists; set this only after Blockscout confirms every module.
  const verified = process.env.MAINNET_DEPLOYMENT_VERIFIED === "1";
  const mainnetEntries = metadata.map((contract) => readDeployment(broadcast, contract, verified));
  const testnetEntries = projectContractDeployments[46630];
  const entriesJson = JSON.stringify(mainnetEntries, null, 2).replace(/^/gm, "  ");
  const testnetJson = JSON.stringify(testnetEntries, null, 2).replace(/^/gm, "  ");
  const content = `import type { ContractChainId, ContractDeployment } from "./deployments";\n\n/** Generated from the confirmed Foundry Mainnet and Testnet broadcasts. */\nexport const projectContractDeployments: Readonly<Record<ContractChainId, readonly ContractDeployment[]>> = {\n  4663: ${entriesJson},\n  46630: ${testnetJson},\n};\n\nexport function getProjectContractDeployments(\n  chainId: ContractChainId,\n): readonly ContractDeployment[] {\n  return projectContractDeployments[chainId];\n}\n`;
  writeFileSync(outputPath, content, "utf8");
  console.log(`Synchronized ${mainnetEntries.length} CLEAVE Mainnet deployments and preserved ${testnetEntries.length} Testnet deployments.`);
  console.log(`Mainnet source verification: ${verified ? "VERIFIED" : "DEPLOYED / NOT VERIFIED"}`);
}

main();
