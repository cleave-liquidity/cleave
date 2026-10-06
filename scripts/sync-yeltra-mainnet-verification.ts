import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getVerificationStatus,
  loadYeltraMainnetContracts,
  verifyChainId,
  YELTRA_MAINNET_CHAIN_ID,
  type VerificationStatus,
} from "./yeltra-mainnet-verification";

const repoDir = process.cwd();
const deploymentRegistryPath = join(repoDir, "lib", "contracts", "project-deployments.ts");

function updateRegistry(
  statuses: ReadonlyMap<string, VerificationStatus>,
): void {
  let source = readFileSync(deploymentRegistryPath, "utf8");
  for (const [address, status] of statuses) {
    if (status !== "VERIFIED" && status !== "NOT VERIFIED") {
      throw new Error(`Refusing to sync non-final status for ${address}: ${status}`);
    }
    const marker = `"address": "${address}"`;
    const addressIndex = source.toLowerCase().indexOf(marker.toLowerCase());
    if (addressIndex < 0) throw new Error(`No deployment registry entry found for ${address}.`);
    const objectStart = source.lastIndexOf("      {", addressIndex);
    const objectEnd = source.indexOf("\n      },", addressIndex);
    if (objectStart < 0 || objectEnd < 0) throw new Error(`Could not isolate registry entry for ${address}.`);
    const entry = source.slice(objectStart, objectEnd);
    const verified = status === "VERIFIED" ? "true" : "false";
    const nextEntry = entry
      .replace(/("verified":\s*)(true|false)/, `$1${verified}`)
      .replace(/("verificationStatus":\s*")(VERIFIED|DEPLOYED \/ NOT VERIFIED)(")/, `$1${status === "VERIFIED" ? "VERIFIED" : "DEPLOYED / NOT VERIFIED"}$3`);
    if (nextEntry === entry) continue;
    source = `${source.slice(0, objectStart)}${nextEntry}${source.slice(objectEnd)}`;
  }
  writeFileSync(deploymentRegistryPath, source, "utf8");
}

async function main(): Promise<void> {
  const chainId = await verifyChainId();
  if (chainId !== YELTRA_MAINNET_CHAIN_ID) {
    throw new Error(`Refusing status sync: RPC returned chain ${chainId}, expected ${YELTRA_MAINNET_CHAIN_ID}.`);
  }
  const contracts = loadYeltraMainnetContracts();
  const statuses = new Map<string, VerificationStatus>();
  for (const contract of contracts) {
    const status = await getVerificationStatus(contract);
    statuses.set(contract.address.toLowerCase(), status);
    console.log(`${contract.name.padEnd(28)} ${status}`);
  }

  if ([...statuses.values()].some((status) => status !== "VERIFIED" && status !== "NOT VERIFIED")) {
    console.error("Local verification metadata was not changed because live Blockscout status is incomplete.");
    console.error("BLOCKED BY BLOCKSCOUT CLOUDFLARE or unavailable status response.");
    process.exitCode = 2;
    return;
  }

  updateRegistry(statuses);
  console.log(`Updated ${statuses.size} Mainnet verification statuses from live Blockscout responses.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "YELTRA verification status sync failed.");
  process.exitCode = 1;
});
