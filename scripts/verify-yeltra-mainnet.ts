import {
  explorerAddress,
  getVerificationStatus,
  loadYeltraMainnetContracts,
  pollVerification,
  submitVerification,
  verifyChainId,
  type VerificationStatus,
  type YeltraMainnetContract,
  YELTRA_MAINNET_CHAIN_ID,
} from "./yeltra-mainnet-verification";

type Row = {
  contract: YeltraMainnetContract;
  status: VerificationStatus;
  action: string;
};

function printSummary(rows: Row[]): void {
  console.log("\nYELTRA MAINNET VERIFICATION SUMMARY");
  console.log("=".repeat(92));
  for (const row of rows) {
    console.log(`${row.contract.name.padEnd(28)} ${row.status.padEnd(38)} ${row.action}`);
  }
  console.log("=".repeat(92));
}

async function main(): Promise<void> {
  const chainId = await verifyChainId();
  if (chainId !== YELTRA_MAINNET_CHAIN_ID) {
    throw new Error(`Refusing verification: RPC returned chain ${chainId}, expected ${YELTRA_MAINNET_CHAIN_ID}.`);
  }

  const contracts = loadYeltraMainnetContracts();
  const rows: Row[] = [];
  const initialStatuses = new Map<string, VerificationStatus>();

  console.log(`Target: Robinhood Chain Mainnet ${YELTRA_MAINNET_CHAIN_ID}`);
  console.log(`Explorer: ${explorerAddress(contracts[0])}`.replace(`/address/${contracts[0].address}`, ""));
  console.log("Checking live Blockscout verification status...");

  for (const contract of contracts) {
    const status = await getVerificationStatus(contract);
    initialStatuses.set(contract.address.toLowerCase(), status);
    console.log(`${contract.name.padEnd(28)} ${status}`);
  }

  if ([...initialStatuses.values()].some((status) => status === "BLOCKED BY BLOCKSCOUT CLOUDFLARE")) {
    for (const contract of contracts) {
      const status = initialStatuses.get(contract.address.toLowerCase()) || "UNAVAILABLE";
      rows.push({ contract, status, action: status === "VERIFIED" ? "SKIPPED" : "NOT SUBMITTED" });
    }
    printSummary(rows);
    console.error("BLOCKED BY BLOCKSCOUT CLOUDFLARE");
    console.error("No verification submissions were attempted because live status could not be read safely.");
    process.exitCode = 2;
    return;
  }

  for (const contract of contracts) {
    const initial = initialStatuses.get(contract.address.toLowerCase()) || "UNAVAILABLE";
    if (initial === "VERIFIED") {
      rows.push({ contract, status: initial, action: "SKIPPED" });
      continue;
    }
    if (initial !== "NOT VERIFIED") {
      rows.push({ contract, status: initial, action: "NOT SUBMITTED" });
      continue;
    }

    console.log(`Submitting ${contract.name} using ${contract.jsonPath}`);
    const submission = await submitVerification(contract);
    if (submission.status === "BLOCKED BY BLOCKSCOUT CLOUDFLARE") {
      rows.push({ contract, status: submission.status, action: "NOT SUBMITTED" });
      continue;
    }
    if (!submission.guid) {
      rows.push({ contract, status: submission.status, action: "SUBMISSION FAILED" });
      continue;
    }
    const status = await pollVerification(submission.guid);
    rows.push({ contract, status, action: status === "VERIFIED" ? "SUBMITTED" : "SUBMITTED · CHECK REQUIRED" });
  }

  printSummary(rows);
  if (rows.some((row) => row.status !== "VERIFIED")) process.exitCode = 2;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "YELTRA verification failed.");
  process.exitCode = 1;
});
