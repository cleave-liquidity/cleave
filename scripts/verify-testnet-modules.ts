import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const chainId = 46630;
const repoDir = process.cwd();
const broadcastPath = join(repoDir, "contracts", "broadcast", "DeployTestnetModules.s.sol", String(chainId), "run-latest.json");
const verifierUrl = "https://explorer.testnet.chain.robinhood.com/api";

type JsonObject = Record<string, unknown>;
type ContractSpec = { name: string; constructorTypes: string[] };

const specs: readonly ContractSpec[] = [
  { name: "CleaveAccessManager", constructorTypes: ["address"] },
  { name: "CleaveAdapterRegistry", constructorTypes: ["address"] },
  { name: "CleaveMarketRegistry", constructorTypes: ["address", "address"] },
  { name: "CleaveRiskGuard", constructorTypes: ["address"] },
  { name: "CleaveExecutionRouter", constructorTypes: ["address", "address", "address", "address"] },
  { name: "CleaveLifecycleManager", constructorTypes: ["address"] },
  { name: "CleaveLens", constructorTypes: ["address", "address", "address", "address", "address", "address", "address"] },
];

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Missing ${label} in Testnet broadcast.`);
  return value;
}

function main(): void {
  const broadcast = JSON.parse(readFileSync(broadcastPath, "utf8")) as JsonObject;
  if (Number(broadcast.chain) !== chainId) throw new Error("Refusing verification for a non-Testnet broadcast.");
  const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions.map(asObject) : [];

  for (const spec of specs) {
    const transaction = transactions.find((candidate) =>
      candidate.contractName === spec.name && candidate.transactionType === "CREATE",
    );
    if (!transaction) throw new Error(`No ${spec.name} CREATE transaction found.`);

    const address = asString(transaction.contractAddress, `${spec.name} address`);
    const constructorArgs = Array.isArray(transaction.arguments)
      ? transaction.arguments.map((argument) => asString(argument, `${spec.name} constructor argument`))
      : [];
    if (constructorArgs.length !== spec.constructorTypes.length) {
      throw new Error(`${spec.name} constructor argument count does not match the reviewed source.`);
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
      "--watch",
      address,
      source,
    ], { cwd: repoDir, stdio: "inherit" });
  }
}

main();
