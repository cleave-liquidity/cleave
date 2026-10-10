import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPublicClient, http, type Address, type Hex, type PublicClient } from "viem";
import {
  getOptionsDeployment,
  optionsErc20Abi,
  optionsMarketAbi,
  optionsVaultAbi,
  optionsExplorerBase,
  rateIndexAbi,
  type OptionsDeployment,
} from "../lib/options/options-contract";
import { robinhoodChainTestnet } from "../lib/web3/chains";
import {
  optionsCheck,
  optionsCinematicStep,
  optionsHeader,
  optionsLine,
  optionsPaint,
  optionsSection,
} from "./options-terminal";

const TESTNET_CHAIN_ID = 46630;
const args = new Set(process.argv.slice(2));
const cinematicMode = args.has("--cinematic");
const configuredRpcUrl = process.env.ROBINHOOD_TESTNET_RPC_URL?.trim()
  || process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL?.trim();
const rpcUrl = configuredRpcUrl || "https://rpc.testnet.chain.robinhood.com";
const repoDir = process.cwd();

type BroadcastTransaction = {
  hash?: string | null;
  transactionType?: string;
  contractName?: string;
  contractAddress?: string;
};

type BroadcastFile = {
  transactions?: BroadcastTransaction[];
};

type TransactionRecord = BroadcastTransaction & {
  source: "DEPLOYMENT" | "FUNDING";
  hash: Hex;
};

const freshDeploymentBroadcastPath = join(
  repoDir,
  "contracts",
  "broadcast",
  "DeployYeltraRateOptionsFreshAdminTestnet.s.sol",
  "46630",
  "run-latest.json",
);
const legacyDeploymentBroadcastPath = join(
  repoDir,
  "contracts",
  "broadcast",
  "DeployYeltraRateOptionsDevelopmentTestnet.s.sol",
  "46630",
  "run-latest.json",
);
const fundingBroadcastPath = join(
  repoDir,
  "contracts",
  "broadcast",
  "FundYeltraRateOptionsDevelopmentTestnet.s.sol",
  "46630",
  "run-latest.json",
);

function asAddress(value: string | undefined): Address | undefined {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value)
    ? (value as Address)
    : undefined;
}

async function readBroadcastTransactions(): Promise<TransactionRecord[]> {
  const records: TransactionRecord[] = [];
  const seen = new Set<string>();
  let deploymentPath = legacyDeploymentBroadcastPath;
  try {
    const freshPayload = JSON.parse(await readFile(freshDeploymentBroadcastPath, "utf8")) as BroadcastFile;
    if (freshPayload.transactions?.some(
      (transaction) => transaction.transactionType === "CREATE" && transaction.contractName === "YeltraAccessManager",
    )) deploymentPath = freshDeploymentBroadcastPath;
  } catch {
    // Keep the existing deployment metadata as fallback when no fresh stack has been broadcast.
  }

  for (const [source, path] of [["DEPLOYMENT", deploymentPath], ["FUNDING", fundingBroadcastPath]] as const) {
    try {
      const payload = JSON.parse(await readFile(path, "utf8")) as BroadcastFile;
      for (const transaction of payload.transactions || []) {
        if (!transaction.hash || !transaction.hash.startsWith("0x") || seen.has(transaction.hash)) continue;
        seen.add(transaction.hash);
        records.push({ ...transaction, source, hash: transaction.hash as Hex });
      }
    } catch {
      // Local broadcast metadata is optional; live chain reads remain authoritative.
    }
  }
  return records;
}

function deploymentFromBroadcast(records: TransactionRecord[]): OptionsDeployment | undefined {
  const contracts = new Map(
    records
      .filter((record) => record.source === "DEPLOYMENT" && record.transactionType === "CREATE")
      .map((record) => [record.contractName, asAddress(record.contractAddress)]),
  );
  const market = contracts.get("YeltraRateOptionsMarket");
  const rateIndex = contracts.get("YeltraRateIndex");
  const collateralVault = contracts.get("YeltraOptionsCollateralVault");
  const collateralToken = contracts.get("YeltraTestnetDevelopmentCollateral");
  if (!market || !rateIndex || !collateralVault) return undefined;
  return { market, rateIndex, collateralVault, collateralToken };
}

type BytecodeStatus = "PRESENT" | "ABSENT" | "UNAVAILABLE";

async function readBytecodeStatus(client: PublicClient, address: Address): Promise<BytecodeStatus> {
  try {
    const bytecode = await client.getBytecode({ address });
    return bytecode && bytecode !== "0x" ? "PRESENT" : "ABSENT";
  } catch {
    return "UNAVAILABLE";
  }
}

async function printTransactions(
  client: PublicClient,
  records: TransactionRecord[],
): Promise<"PASS" | "FAIL" | "UNAVAILABLE"> {
  optionsSection("TRANSACTIONS");
  if (!records.length) {
    optionsLine("Local receipts", "NOT AVAILABLE · LIVE STATUS ONLY");
    return "PASS";
  }

  const latestBlock = await client.getBlockNumber().catch(() => undefined);
  let result: "PASS" | "FAIL" | "UNAVAILABLE" = latestBlock === undefined ? "UNAVAILABLE" : "PASS";
  for (const record of records) {
    console.log();
    console.log(
      optionsPaint(
        `  ${record.source} · ${record.contractName || record.transactionType || "TRANSACTION"}`,
        "white",
      ),
    );
    optionsLine("Transaction", record.hash);
    optionsLine("Explorer", `${optionsExplorerBase}/tx/${record.hash}`);
    const receipt = await client.getTransactionReceipt({ hash: record.hash }).catch(() => undefined);
    if (!receipt) {
      if (result !== "FAIL") result = latestBlock === undefined ? "UNAVAILABLE" : "FAIL";
      optionsLine("Receipt", latestBlock === undefined ? "UNAVAILABLE · RPC REQUEST FAILED" : "NOT FOUND · LIVE RECEIPT UNCONFIRMED");
      continue;
    }
    const success = receipt.status === "success";
    if (!success) result = "FAIL";
    const confirmations = latestBlock !== undefined && latestBlock >= receipt.blockNumber
      ? latestBlock - receipt.blockNumber + BigInt(1)
      : BigInt(0);
    optionsLine(
      "Receipt",
      `${success ? "CONFIRMED" : "REVERTED"} · block #${receipt.blockNumber} · gas ${receipt.gasUsed.toLocaleString("en-US")} · ${confirmations} confirmations`,
    );
  }
  return result;
}

async function main(): Promise<void> {
  const client = createPublicClient({ chain: robinhoodChainTestnet, transport: http(rpcUrl) });
  const records = await readBroadcastTransactions();
  const configuredDeployment = getOptionsDeployment(TESTNET_CHAIN_ID);
  const deployment = configuredDeployment || deploymentFromBroadcast(records);

  await optionsHeader("status", cinematicMode);
  await optionsCinematicStep(
    "Validating network",
    [{ text: `Robinhood Chain Testnet · ${TESTNET_CHAIN_ID}`, tone: "green" }],
    220,
    cinematicMode,
  );
  await optionsCinematicStep(
    "Resolving deployment metadata",
    [{ text: deployment ? "Configured addresses resolved; live verification follows" : "Deployment metadata unavailable", tone: deployment ? "green" : "yellow" }],
    260,
    cinematicMode,
  );

  optionsSection("NETWORK");
  optionsLine("Network", "Robinhood Chain Testnet");
  optionsLine("Chain ID", String(TESTNET_CHAIN_ID));
  optionsLine("RPC", configuredRpcUrl ? "CONFIGURED" : "DEFAULT PUBLIC ENDPOINT");
  optionsLine(
    "Metadata",
    configuredDeployment
      ? "ENVIRONMENT CONFIGURED"
      : deployment
        ? "BROADCAST METADATA · READ-ONLY"
        : "NOT CONFIGURED",
  );

  if (!deployment) {
    optionsSection("FINAL STATUS");
    optionsLine("Status", "NOT DEPLOYED / COLLATERAL CONFIGURATION REQUIRED");
    optionsLine("Action", "Supply verified Testnet addresses after guarded deployment");
    console.log(optionsPaint("──────────────────────────────────────────────────────────────────", "dim"));
    return;
  }

  optionsSection("DEPLOYED CONTRACTS");
  const contractAddresses: Array<[string, Address]> = [
    ["yDEVUSD", deployment.collateralToken || "0x0000000000000000000000000000000000000000" as Address],
    ["Yield Rate Index", deployment.rateIndex],
    ["Collateral Vault", deployment.collateralVault],
    ["Options Market", deployment.market],
  ];
  const bytecodeResults = await Promise.all(contractAddresses.map(async ([label, address]) =>
    label === "yDEVUSD" && !deployment.collateralToken
      ? "UNAVAILABLE" as const
      : readBytecodeStatus(client, address),
  ));
  for (const [index, [label, address]] of contractAddresses.entries()) {
    const status = bytecodeResults[index];
    const addressLabel = label === "yDEVUSD" && !deployment.collateralToken ? "NOT CONFIGURED" : address;
    optionsLine(label, `${addressLabel} · ${status === "PRESENT" ? "BYTECODE PRESENT" : status === "ABSENT" ? "NO BYTECODE" : "RPC UNAVAILABLE · NOT VERIFIED"}`);
    if (label === "Options Market") optionsLine("Explorer", `${optionsExplorerBase}/address/${address}`);
  }

  optionsSection("VALIDATION");
  const allBytecodePresent = bytecodeResults.every((status) => status === "PRESENT");
  const bytecodeUnavailable = bytecodeResults.some((status) => status === "UNAVAILABLE");
  optionsLine(
    "Contract bytecode",
    bytecodeUnavailable ? "RPC UNAVAILABLE · NOT VERIFIED" : allBytecodePresent ? "ALL PRESENT" : "ONE OR MORE ABSENT",
  );

  let capacity: bigint | undefined;
  let developmentOnly = false;
  let tokenAddress: Address | undefined;
  let stateRead = true;
  try {
    const [rate, observedAt, fresh, availableCollateral, marketToken] = await Promise.all([
      client.readContract({ address: deployment.rateIndex, abi: rateIndexAbi, functionName: "latestRate" }),
      client.readContract({ address: deployment.rateIndex, abi: rateIndexAbi, functionName: "latestObservedAt" }),
      client.readContract({ address: deployment.rateIndex, abi: rateIndexAbi, functionName: "isFresh" }),
      client.readContract({ address: deployment.collateralVault, abi: optionsVaultAbi, functionName: "availableCollateral" }),
      client.readContract({ address: deployment.market, abi: optionsMarketAbi, functionName: "collateralToken" }),
    ]);
    capacity = availableCollateral;
    tokenAddress = marketToken;
    const [symbol, decimals, developmentMarker] = await Promise.all([
      client.readContract({ address: marketToken, abi: optionsErc20Abi, functionName: "symbol" }),
      client.readContract({ address: marketToken, abi: optionsErc20Abi, functionName: "decimals" }),
      client.readContract({ address: marketToken, abi: optionsErc20Abi, functionName: "DEVELOPMENT_ONLY" }).catch(() => false),
    ]);
    developmentOnly = developmentMarker;
    optionsLine("Rate", `${rate.toString()} · observed ${observedAt.toString()} · ${fresh ? "FRESH" : "STALE"}`);
    optionsLine("Collateral", `${symbol} · ${decimals} decimals`);
    optionsCheck("Development collateral marker", developmentOnly);
    optionsCheck("Market / token wiring", marketToken === deployment.collateralToken);
  } catch {
    stateRead = false;
    optionsLine("Readback", "RPC UNAVAILABLE · LIVE CONTRACT STATE NOT VERIFIED");
  }

  optionsLine("Live contract readback", stateRead ? "AVAILABLE" : "RPC UNAVAILABLE · NOT VERIFIED");
  optionsSection("FUNDING");
  optionsLine(
    "Available collateral",
    capacity === undefined ? "UNAVAILABLE · RPC READ REQUIRED" : `${capacity.toString()} raw yDEVUSD units`,
  );
  optionsLine(
    "Trading capacity",
    capacity === undefined ? "UNAVAILABLE · RPC READ REQUIRED" : capacity > BigInt(0) ? "FUNDED" : "REQUIRED BEFORE OPEN OPTION",
  );
  if (tokenAddress) optionsLine("Collateral token", tokenAddress);

  const transactionStatus = await printTransactions(client, records);
  const rpcUnavailable = bytecodeUnavailable || !stateRead || transactionStatus === "UNAVAILABLE";
  optionsSection("FINAL STATUS");
  optionsLine(
    "Status",
    rpcUnavailable
      ? "RPC UNAVAILABLE · LIVE STATUS NOT VERIFIED"
      : allBytecodePresent && transactionStatus === "PASS"
        ? "DEPLOYED · ROBINHOOD CHAIN TESTNET"
        : "DEPLOYMENT REQUIRES ATTENTION",
  );
  optionsLine(
    "Funding",
    capacity === undefined
      ? "UNAVAILABLE · RPC READ REQUIRED"
      : capacity > BigInt(0)
        ? "READY FOR COLLATERALIZED OPTIONS"
        : "REQUIRED · NO AVAILABLE COLLATERAL",
  );
  console.log(optionsPaint("──────────────────────────────────────────────────────────────────", "dim"));
}

await main();
