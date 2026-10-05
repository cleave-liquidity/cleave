import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const chainId = 46630;
const repoDir = process.cwd();
const outputPath = join(repoDir, "lib", "contracts", "project-deployments.ts");

type JsonObject = Record<string, unknown>;

type ProjectEntry = {
  id: string;
  name: string;
  description: string;
  chainId: number;
  category: string;
  address: `0x${string}`;
  verified: boolean;
  ownership: "project";
  explorerUrl: string;
  usedByRuntime: false;
  runtimeRole: string;
  deploymentTx: `0x${string}`;
  deploymentBlock: number;
  deployer?: `0x${string}`;
  gasUsed?: string;
  verificationStatus: "VERIFIED" | "DEPLOYED / NOT VERIFIED";
};

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function readBroadcast(path: string): JsonObject {
  try {
    const broadcast = JSON.parse(readFileSync(path, "utf8")) as JsonObject;
    if (Number(broadcast.chain) !== chainId) throw new Error(`Broadcast ${path} is not for chain ${chainId}.`);
    return broadcast;
  } catch (error) {
    if (error instanceof Error && error.message.includes("not for chain")) throw error;
    throw new Error(`No valid Testnet broadcast found at ${path}. Deploy first; no registry data was changed.`);
  }
}

function asAddress(value: unknown, label: string): `0x${string}` {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`Broadcast metadata is missing a valid ${label}.`);
  }
  return value as `0x${string}`;
}

function asHash(value: unknown): `0x${string}` {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("Broadcast metadata is missing a valid deployment transaction hash.");
  }
  return value as `0x${string}`;
}

function asBlock(value: unknown): number {
  const block = typeof value === "string" && value.startsWith("0x")
    ? Number.parseInt(value, 16)
    : typeof value === "string" || typeof value === "number"
      ? Number(value)
      : Number.NaN;
  if (!Number.isSafeInteger(block) || block < 0) throw new Error("Broadcast metadata is missing a valid deployment block.");
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
  contractName: string,
  metadata: Pick<ProjectEntry, "id" | "name" | "category" | "description" | "runtimeRole">,
  verified: boolean,
): ProjectEntry {
  const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions.map(asObject) : [];
  const creation = transactions.find((transaction) =>
    transaction.transactionType === "CREATE" && transaction.contractName === contractName,
  );
  if (!creation) throw new Error(`The Testnet broadcast contains no ${contractName} CREATE transaction.`);

  const deploymentTx = asHash(creation.hash);
  const receipts = Array.isArray(broadcast.receipts) ? broadcast.receipts.map(asObject) : [];
  const receipt = receipts.find((candidate) => candidate.transactionHash === deploymentTx) ?? asObject(creation.receipt);
  if (receipt.status !== "0x1" && receipt.status !== "1") {
    throw new Error(`The ${contractName} deployment receipt did not succeed.`);
  }

  const transaction = asObject(creation.transaction);
  const address = asAddress(creation.contractAddress, `${contractName} address`);
  const deployerValue = transaction.from ?? receipt.from ?? creation.from;
  const deployer = deployerValue === undefined ? undefined : asAddress(deployerValue, `${contractName} deployer address`);
  const deploymentBlock = asBlock(receipt.blockNumber ?? creation.blockNumber);
  const gasUsed = asQuantity(receipt.gasUsed);

  return {
    ...metadata,
    chainId,
    address,
    verified,
    ownership: "project",
    explorerUrl: `https://explorer.testnet.chain.robinhood.com/address/${address}`,
    usedByRuntime: false,
    deploymentTx,
    deploymentBlock,
    ...(deployer ? { deployer } : {}),
    ...(gasUsed ? { gasUsed } : {}),
    verificationStatus: verified ? "VERIFIED" : "DEPLOYED / NOT VERIFIED",
  };
}

function main(): void {
  const verifiedModules = process.env.DEPLOYMENT_VERIFIED === "1";
  const existingBroadcast = readBroadcast(join(repoDir, "contracts", "broadcast", "Deploy.s.sol", String(chainId), "run-latest.json"));
  const moduleBroadcast = readBroadcast(join(repoDir, "contracts", "broadcast", "DeployTestnetModules.s.sol", String(chainId), "run-latest.json"));

  const entries: ProjectEntry[] = [
    readDeployment(existingBroadcast, "CleaveRegistry", {
      id: "yeltra-registry-testnet",
      name: "CleaveRegistry",
      category: "core",
      description: "Existing YELTRA-owned configuration anchor; preserved without redeployment.",
      runtimeRole: "Top-level YELTRA discovery/configuration anchor; not part of the Pendle trade execution path.",
    }, true),
    readDeployment(moduleBroadcast, "CleaveAccessManager", {
      id: "yeltra-access-manager-testnet",
      name: "CleaveAccessManager",
      category: "core",
      description: "Central YELTRA protocol role authority.",
      runtimeRole: "Shared admin, operator, and guardian authorization layer for YELTRA modules.",
    }, verifiedModules),
    readDeployment(moduleBroadcast, "CleaveAdapterRegistry", {
      id: "yeltra-adapter-registry-testnet",
      name: "CleaveAdapterRegistry",
      category: "integration",
      description: "Approved external yield protocol integration registry.",
      runtimeRole: "Registry-only external adapter configuration; no arbitrary protocol execution.",
    }, verifiedModules),
    readDeployment(moduleBroadcast, "CleaveMarketRegistry", {
      id: "yeltra-market-registry-testnet",
      name: "CleaveMarketRegistry",
      category: "integration",
      description: "Verified external market metadata registry.",
      runtimeRole: "Registry-only market, PT, YT, SY, underlying, maturity, and adapter metadata.",
    }, verifiedModules),
    readDeployment(moduleBroadcast, "CleaveRiskGuard", {
      id: "yeltra-risk-guard-testnet",
      name: "CleaveRiskGuard",
      category: "risk",
      description: "Non-custodial global, market, and adapter pause controls.",
      runtimeRole: "Risk state consumed by the YELTRA execution boundary.",
    }, verifiedModules),
    readDeployment(moduleBroadcast, "CleaveExecutionRouter", {
      id: "yeltra-execution-router-testnet",
      name: "CleaveExecutionRouter",
      category: "execution",
      description: "Validated YELTRA execution boundary without arbitrary external calls.",
      runtimeRole: "Validates market, adapter, and risk state; current frontend Pendle execution remains direct.",
    }, verifiedModules),
    readDeployment(moduleBroadcast, "CleaveLifecycleManager", {
      id: "yeltra-lifecycle-manager-testnet",
      name: "CleaveLifecycleManager",
      category: "execution",
      description: "Fixed Yield and Trading Yield lifecycle eligibility rules.",
      runtimeRole: "Read-only sell, maturity, expiry, and yield-claim eligibility rules; no settlement or amount fabrication.",
    }, verifiedModules),
    readDeployment(moduleBroadcast, "CleaveLens", {
      id: "yeltra-lens-testnet",
      name: "CleaveLens",
      category: "read",
      description: "Read-only aggregation layer for YELTRA modules and market state.",
      runtimeRole: "Canonical combined read surface for frontend and deployment diagnostics.",
    }, verifiedModules),
  ];

  const entriesJson = JSON.stringify(entries, null, 2).replace(/^/gm, "  ");
  const content = `import type { ContractChainId, ContractDeployment } from "./deployments";\n\n/** Generated from the confirmed Foundry Testnet broadcasts. */\nexport const projectContractDeployments: Readonly<Record<ContractChainId, readonly ContractDeployment[]>> = {\n  4663: [],\n  46630: ${entriesJson},\n};\n\nexport function getProjectContractDeployments(\n  chainId: ContractChainId,\n): readonly ContractDeployment[] {\n  return projectContractDeployments[chainId];\n}\n`;
  writeFileSync(outputPath, content, "utf8");
  console.log(`Synchronized ${entries.length} YELTRA Testnet deployments from confirmed broadcasts.`);
}

main();
