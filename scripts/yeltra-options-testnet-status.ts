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

const broadcastPaths = [
  [
    "DEPLOYMENT",
    join(
      repoDir,
      "contracts",
      "broadcast",
      "DeployYeltraRateOptionsDevelopmentTestnet.s.sol",
      "46630",
      "run-latest.json",
    ),
  ],
  [
    "FUNDING",
    join(
      repoDir,
      "contracts",
      "broadcast",
      "FundYeltraRateOptionsDevelopmentTestnet.s.sol",
      "46630",
      "run-latest.json",
    ),
  ],
] as const;

function asAddress(value: string | undefined): Address | undefined {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value)
    ? (value as Address)
    : undefined;
}

async function readBroadcastTransactions(): Promise<TransactionRecord[]> {
  const records: TransactionRecord[] = [];
  const seen = new Set<string>();
  for (const [source, path] of broadcastPaths) {
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

async function hasBytecode(client: PublicClient, address: Address): Promise<boolean> {
  const bytecode = await client.getBytecode({ address }).catch(() => undefined);
  return Boolean(bytecode && bytecode !== "0x");
}

async function printTransactions(
  client: PublicClient,
  records: TransactionRecord[],
): Promise<boolean> {
  optionsSection("TRANSACTIONS");
  if (!records.length) {
    optionsLine("Local receipts", "NOT AVAILABLE · LIVE STATUS ONLY");
    return true;
  }

  const latestBlock = await client.getBlockNumber().catch(() => undefined);
  let allConfirmed = true;
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
      allConfirmed = false;
      optionsLine("Receipt", "PENDING / NOT FOUND");
      continue;
    }
    const success = receipt.status === "success";
    if (!success) allConfirmed = false;
    const confirmations = latestBlock !== undefined && latestBlock >= receipt.blockNumber
      ? latestBlock - receipt.blockNumber + BigInt(1)
      : BigInt(0);
    optionsLine(
      "Receipt",
      `${success ? "CONFIRMED" : "REVERTED"} · block #${receipt.blockNumber} · gas ${receipt.gasUsed.toLocaleString("en-US")} · ${confirmations} confirmations`,
    );
  }
  return allConfirmed;
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
    "Checking live Options contracts",
    [{ text: deployment ? "Deployment metadata resolved" : "Deployment metadata unavailable", tone: deployment ? "green" : "yellow" }],
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
  const bytecodeResults = await Promise.all(
    contractAddresses.map(async ([, address]) => hasBytecode(client, address)),
  );
  for (const [index, [label, address]] of contractAddresses.entries()) {
    const present = bytecodeResults[index];
    optionsLine(label, `${address} · ${present ? "BYTECODE PRESENT" : "NO BYTECODE"}`);
    if (label === "Options Market") optionsLine("Explorer", `${optionsExplorerBase}/address/${address}`);
  }

  optionsSection("VALIDATION");
  const allBytecodePresent = bytecodeResults.every(Boolean);
  optionsCheck("Contract bytecode", allBytecodePresent);

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
  } catch (error) {
    stateRead = false;
    optionsLine("Readback", `READ FAILED · ${error instanceof Error ? error.message : "unknown error"}`);
  }

  optionsCheck("Live contract readback", stateRead);
  optionsSection("FUNDING");
  optionsLine(
    "Available collateral",
    capacity === undefined ? "UNAVAILABLE" : `${capacity.toString()} raw yDEVUSD units`,
  );
  optionsLine(
    "Trading capacity",
    capacity && capacity > BigInt(0) ? "FUNDED" : "REQUIRED BEFORE OPEN OPTION",
  );
  if (tokenAddress) optionsLine("Collateral token", tokenAddress);

  const transactionsConfirmed = await printTransactions(client, records);
  optionsSection("FINAL STATUS");
  optionsLine(
    "Status",
    allBytecodePresent && transactionsConfirmed
      ? "DEPLOYED · ROBINHOOD CHAIN TESTNET"
      : "DEPLOYMENT REQUIRES ATTENTION",
  );
  optionsLine(
    "Funding",
    capacity && capacity > BigInt(0)
      ? "READY FOR COLLATERALIZED OPTIONS"
      : "REQUIRED · NO AVAILABLE COLLATERAL",
  );
  console.log(optionsPaint("──────────────────────────────────────────────────────────────────", "dim"));
}

await main();
