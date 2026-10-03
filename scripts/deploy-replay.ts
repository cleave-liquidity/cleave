import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoDir = process.cwd();
const broadcastRoots = ["Deploy.s.sol", "DeployTestnetModules.s.sol", "DeployMainnet.s.sol"];

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function main(): void {
  let found = 0;
  console.log("CLEAVE DEPLOYMENT REPLAY · READ ONLY");
  for (const root of broadcastRoots) {
    for (const chainId of ["4663", "46630"]) {
      const path = join(repoDir, "contracts", "broadcast", root, chainId, "run-latest.json");
      if (!existsSync(path)) continue;
      const broadcast = JSON.parse(readFileSync(path, "utf8")) as JsonObject;
      const receipts = Array.isArray(broadcast.receipts) ? broadcast.receipts.map(asObject) : [];
      const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions.map(asObject) : [];
      console.log(`\n${root} · chain ${chainId}`);
      for (const transaction of transactions.filter((item) => item.transactionType === "CREATE")) {
        const hash = transaction.hash;
        const receipt = receipts.find((candidate) => candidate.transactionHash === hash) || {};
        console.log([
          String(transaction.contractName),
          `address=${String(transaction.contractAddress)}`,
          `tx=${String(hash)}`,
          `block=${String(receipt.blockNumber ?? "UNAVAILABLE")}`,
          `gas=${String(receipt.gasUsed ?? "UNAVAILABLE")}`,
        ].join(" · "));
        found += 1;
      }
    }
  }
  if (found === 0) console.log("No broadcast artifacts found.");
  console.log("\nNo transactions were sent.");
}

main();
