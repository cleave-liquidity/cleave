import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoDir = process.cwd();
const outputPath = join(repoDir, "lib", "contracts", "project-deployments.ts");
const sourcePath = join(repoDir, "lib", "contracts", "project-deployments.ts");
type JsonObject = Record<string, unknown>;
type ContractEntry = {
  id: string;
  name: string;
  description: string;
  chainId: number;
  category: string;
  address: `0x${string}`;
  verified: boolean;
  ownership: "project";
  explorerUrl: string;
  usedByRuntime: true;
  runtimeRole: string;
  deploymentTx: `0x${string}`;
  deploymentBlock: number;
  deployer?: `0x${string}`;
  gasUsed?: string;
  verificationStatus: "VERIFIED" | "DEPLOYED / NOT VERIFIED";
};

const metadata = [
  ["access-manager", "YeltraAccessManager", "core", "Central YELTRA protocol role authority.", "Shared admin, operator, and guardian authorization layer for YELTRA modules."],
  ["registry", "YeltraRegistry", "core", "YELTRA-owned configuration anchor.", "Top-level YELTRA discovery/configuration anchor; not part of the Pendle trade execution path."],
  ["adapter-registry", "YeltraAdapterRegistry", "integration", "Approved external yield protocol integration registry.", "Registry-only external adapter configuration; no arbitrary protocol execution."],
  ["market-registry", "YeltraMarketRegistry", "integration", "Verified external market metadata registry.", "Registry-only market, PT, YT, SY, underlying, maturity, and adapter metadata."],
  ["risk-guard", "YeltraRiskGuard", "risk", "Non-custodial global, market, and adapter pause controls.", "Risk state consumed by the YELTRA execution boundary."],
  ["execution-router", "YeltraExecutionRouter", "execution", "Validated YELTRA execution boundary without arbitrary external calls.", "Validates market, adapter, and risk state; current frontend Pendle execution remains direct."],
  ["lifecycle-manager", "YeltraLifecycleManager", "execution", "Fixed Yield and Trading Yield lifecycle eligibility rules.", "Read-only sell, maturity, expiry, and yield-claim eligibility rules; no settlement or amount fabrication."],
  ["lens", "YeltraLens", "read", "Read-only aggregation layer for YELTRA modules and market state.", "Canonical combined read surface for frontend and deployment diagnostics."],
] as const;

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function asAddress(value: unknown, label: string): `0x${string}` {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(`Missing valid ${label}.`);
  return value as `0x${string}`;
}

function asHash(value: unknown, label: string): `0x${string}` {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(`Missing valid ${label}.`);
  return value as `0x${string}`;
}

function asBlock(value: unknown, label: string): number {
  const block = typeof value === "string" && value.startsWith("0x")
    ? Number.parseInt(value, 16)
    : typeof value === "string" || typeof value === "number" ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(block) || block < 0) throw new Error(`Missing valid ${label}.`);
  return block;
}

function asQuantity(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return BigInt(value).toString(10);
}

function readBroadcast(chainId: number, scriptName: string): JsonObject {
  const path = join(repoDir, "contracts", "broadcast", scriptName, String(chainId), "run-latest.json");
  const broadcast = JSON.parse(readFileSync(path, "utf8")) as JsonObject;
  if (Number(broadcast.chain) !== chainId) throw new Error(`Broadcast is not for chain ${chainId}.`);
  return broadcast;
}

function readDeployments(chainId: number, scriptName: string, explorerBase: string, verified: boolean): ContractEntry[] {
  const broadcast = readBroadcast(chainId, scriptName);
  const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions.map(asObject) : [];
  const receipts = Array.isArray(broadcast.receipts) ? broadcast.receipts.map(asObject) : [];
  return metadata.map(([id, name, category, description, runtimeRole]) => {
    const creation = transactions.find((item) => item.transactionType === "CREATE" && item.contractName === name);
    if (!creation) throw new Error(`Broadcast contains no ${name} CREATE transaction.`);
    const deploymentTx = asHash(creation.hash, `${name} deployment transaction`);
    const receipt = receipts.find((item) => item.transactionHash === deploymentTx) ?? asObject(creation.receipt);
    if (receipt.status !== "0x1" && receipt.status !== "1") throw new Error(`${name} deployment receipt did not succeed.`);
    const transaction = asObject(creation.transaction);
    const address = asAddress(creation.contractAddress, `${name} address`);
    const deployerValue = transaction.from ?? receipt.from ?? creation.from;
    const deploymentBlock = asBlock(receipt.blockNumber ?? creation.blockNumber, `${name} deployment block`);
    const gasUsed = asQuantity(receipt.gasUsed);
    return {
      id: `yeltra-${id}-${chainId === 4663 ? "mainnet" : "testnet"}`,
      name,
      description,
      chainId,
      category,
      address,
      verified,
      ownership: "project",
      explorerUrl: `${explorerBase}/address/${address}`,
      usedByRuntime: true,
      runtimeRole,
      deploymentTx,
      deploymentBlock,
      ...(deployerValue ? { deployer: asAddress(deployerValue, `${name} deployer`) } : {}),
      ...(gasUsed ? { gasUsed } : {}),
      verificationStatus: verified ? "VERIFIED" : "DEPLOYED / NOT VERIFIED",
    };
  });
}

function main(): void {
  const oldModule = require("../lib/contracts/project-deployments") as {
    legacyProjectContractDeployments?: Record<string, readonly unknown[]>;
    projectContractDeployments: Record<string, readonly unknown[]>;
  };
  const legacy = oldModule.legacyProjectContractDeployments ?? oldModule.projectContractDeployments;
  const testnetVerified = process.env.YELTRA_TESTNET_DEPLOYMENT_VERIFIED === "1";
  const mainnetVerified = process.env.YELTRA_MAINNET_DEPLOYMENT_VERIFIED === "1";
  const onlyTestnet = process.argv.includes("--testnet");
  const onlyMainnet = process.argv.includes("--mainnet");
  if (onlyTestnet && onlyMainnet) throw new Error("Choose only one registry sync scope.");
  const mainnet = onlyTestnet
    ? oldModule.projectContractDeployments["4663"]
    : readDeployments(4663, "DeployYeltraMainnet.s.sol", "https://robinhoodchain.blockscout.com", mainnetVerified);
  const testnet = onlyMainnet
    ? oldModule.projectContractDeployments["46630"]
    : readDeployments(46630, "DeployYeltraTestnet.s.sol", "https://explorer.testnet.chain.robinhood.com", testnetVerified);
  const entriesJson = JSON.stringify({ 4663: mainnet, 46630: testnet }, null, 2).replace(/^/gm, "  ");
  const legacyJson = JSON.stringify(legacy, null, 2).replace(/^/gm, "  ");
  const content = `import type { ContractChainId, ContractDeployment } from "./deployments";\n\n/** Preserved legacy graph for rollback and historical provenance. */\nexport const legacyProjectContractDeployments: Readonly<Record<ContractChainId, readonly ContractDeployment[]>> = ${legacyJson};\n\n/** Generated only from confirmed YELTRA Foundry broadcasts. */\nexport const projectContractDeployments: Readonly<Record<ContractChainId, readonly ContractDeployment[]>> = ${entriesJson};\n\nexport function getProjectContractDeployments(\n  chainId: ContractChainId,\n): readonly ContractDeployment[] {\n  return projectContractDeployments[chainId];\n}\n`;
  writeFileSync(outputPath, content, "utf8");
  console.log(`Synchronized ${mainnet.length} YELTRA Mainnet and ${testnet.length} YELTRA Testnet deployments.`);
  console.log(`Source verification: Mainnet ${mainnetVerified ? "VERIFIED" : "DEPLOYED / NOT VERIFIED"}; Testnet ${testnetVerified ? "VERIFIED" : "DEPLOYED / NOT VERIFIED"}`);
}

main();
