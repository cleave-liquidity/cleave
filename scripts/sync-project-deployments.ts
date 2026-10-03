import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const chainId = 46630;
const repoDir = process.cwd();
const broadcastPath = join(repoDir, "contracts", "broadcast", "Deploy.s.sol", String(chainId), "run-latest.json");
const outputPath = join(repoDir, "lib", "contracts", "project-deployments.ts");

type JsonObject = Record<string, unknown>;

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
  if (!Number.isSafeInteger(block) || block < 0) {
    throw new Error("Broadcast metadata is missing a valid deployment block.");
  }
  return block;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asOptionalQuantity(value: unknown): string | undefined {
  const raw = asOptionalString(value);
  if (raw === undefined) return undefined;
  try {
    return BigInt(raw).toString(10);
  } catch {
    throw new Error("Broadcast metadata contains an invalid gas-used quantity.");
  }
}

function main(): void {
  const verified = process.env.DEPLOYMENT_VERIFIED === "1";
  let broadcast: JsonObject;
  try {
    broadcast = JSON.parse(readFileSync(broadcastPath, "utf8")) as JsonObject;
  } catch {
    throw new Error(`No Testnet broadcast found at ${broadcastPath}. Deploy first; no registry data was changed.`);
  }

  const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions.map(asObject) : [];
  const creation = transactions.find((transaction) =>
    transaction.transactionType === "CREATE" && transaction.contractName === "CleaveRegistry",
  );
  if (!creation) throw new Error("The Testnet broadcast contains no CleaveRegistry CREATE transaction.");

  const deploymentTx = asHash(creation.hash);
  const receipts = Array.isArray(broadcast.receipts) ? broadcast.receipts.map(asObject) : [];
  const receipt = receipts.find((candidate) => candidate.transactionHash === deploymentTx) ?? asObject(creation.receipt);
  if (receipt.status !== undefined && receipt.status !== "0x1" && receipt.status !== "1") {
    throw new Error("The CleaveRegistry deployment receipt did not succeed.");
  }
  const transaction = asObject(creation.transaction);
  const address = asAddress(creation.contractAddress, "contract address");
  const deploymentBlock = asBlock(receipt.blockNumber ?? creation.blockNumber);
  const deployerValue = transaction.from ?? receipt.from ?? creation.from;
  const deployer = deployerValue === undefined ? undefined : asAddress(deployerValue, "deployer address");
  const gasUsed = asOptionalQuantity(receipt.gasUsed);

  const entry = {
    id: "cleave-registry-testnet",
    name: "CleaveRegistry",
    description: "CLEAVE-owned configuration anchor for approved external Pendle references; it does not custody funds or execute trades.",
    chainId,
    category: "other",
    address,
    verified,
    ownership: "project",
    explorerUrl: `https://explorer.testnet.chain.robinhood.com/address/${address}`,
    usedByRuntime: false,
    runtimeRole: "Registry-only configuration anchor; not part of the Pendle trade execution path.",
    deploymentTx,
    deploymentBlock,
    ...(deployer ? { deployer } : {}),
    ...(gasUsed ? { gasUsed } : {}),
    verificationStatus: verified ? "VERIFIED" : "DEPLOYED / NOT VERIFIED",
  };

  const content = `import type { ContractChainId, ContractDeployment } from "./deployments";\n\n/** Generated from the verified Foundry Testnet broadcast. */\nexport const projectContractDeployments: Readonly<Record<ContractChainId, readonly ContractDeployment[]>> = {\n  4663: [],\n  46630: [${JSON.stringify(entry, null, 2)}],\n};\n\nexport function getProjectContractDeployments(\n  chainId: ContractChainId,\n): readonly ContractDeployment[] {\n  return projectContractDeployments[chainId];\n}\n`;

  writeFileSync(outputPath, content, "utf8");
  console.log(`Synchronized ${entry.name} at ${entry.address} from Testnet broadcast.`);
}

main();
