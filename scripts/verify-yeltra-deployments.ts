import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoDir = process.cwd();
const mainnet = process.argv.includes("--mainnet");
const chainId = mainnet ? 4663 : 46630;
const broadcastName = mainnet ? "DeployYeltraMainnet.s.sol" : "DeployYeltraTestnet.s.sol";
const verifierUrl = mainnet
  ? "https://robinhoodchain.blockscout.com/api"
  : "https://explorer.testnet.chain.robinhood.com/api";
const specs = [
  { name: "YeltraRegistry", constructorTypes: ["address"] },
  { name: "YeltraAccessManager", constructorTypes: ["address"] },
  { name: "YeltraAdapterRegistry", constructorTypes: ["address"] },
  { name: "YeltraMarketRegistry", constructorTypes: ["address", "address"] },
  { name: "YeltraRiskGuard", constructorTypes: ["address"] },
  { name: "YeltraExecutionRouter", constructorTypes: ["address", "address", "address", "address"] },
  { name: "YeltraLifecycleManager", constructorTypes: ["address"] },
  { name: "YeltraLens", constructorTypes: ["address", "address", "address", "address", "address", "address", "address"] },
] as const;

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function main(): void {
  const broadcastPath = join(repoDir, "contracts", "broadcast", broadcastName, String(chainId), "run-latest.json");
  const broadcast = JSON.parse(readFileSync(broadcastPath, "utf8")) as JsonObject;
  if (Number(broadcast.chain) !== chainId) throw new Error(`Refusing verification for a non-${chainId} broadcast.`);
  const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions.map(asObject) : [];

  for (const spec of specs) {
    const transaction = transactions.find((candidate) => candidate.contractName === spec.name && candidate.transactionType === "CREATE");
    if (!transaction) throw new Error(`No ${spec.name} CREATE transaction found.`);
    const address = transaction.contractAddress;
    if (typeof address !== "string") throw new Error(`No address found for ${spec.name}.`);
    const constructorArgs = Array.isArray(transaction.arguments) ? transaction.arguments.filter((argument): argument is string => typeof argument === "string") : [];
    if (constructorArgs.length !== spec.constructorTypes.length) {
      throw new Error(`${spec.name} constructor argument count does not match the YELTRA source.`);
    }
    const encodedArgs = execFileSync("cast", [
      "abi-encode",
      `constructor(${spec.constructorTypes.join(",")})`,
      ...constructorArgs,
    ], { encoding: "utf8" }).trim();
    const source = `src/${spec.name}.sol:${spec.name}`;
    console.log(`Verifying ${spec.name} at ${address}`);
    execFileSync("forge", [
      "verify-contract",
      "--root", "contracts",
      "--chain", String(chainId),
      "--verifier", "blockscout",
      "--verifier-url", verifierUrl,
      "--constructor-args", encodedArgs,
      "--skip-is-verified-check",
      "--watch",
      address,
      source,
    ], { cwd: repoDir, stdio: "inherit" });
  }
}

main();
