import {
  createPublicClient,
  createWalletClient,
  keccak256,
  http,
  isAddress,
  stringToHex,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhoodChain, robinhoodChainTestnet } from "../lib/web3/chains";
import {
  directoryLabel,
  getDirectoryMarketId,
  MARKET_DIRECTORY_CONFIRMATION,
  MARKET_DIRECTORY_MARKET_TYPES,
  MARKET_DIRECTORY_PROVIDER_IDS,
  readYeltraMarketDirectory,
  validateExternalMarketCandidate,
  yeltraMarketDirectoryAbi,
  type MarketDirectoryEntry,
} from "../lib/markets/market-directory";
import {
  MorphoYieldMarketAdapter,
  MORPHO_STEAKHOUSE_USDG_ENTRY,
} from "../lib/adapters/morpho-yield-market-adapter";
import {
  centerYeltraText,
  cinematicPause,
  renderTerminalDivider,
  renderYeltraLogo,
  terminalPaint,
  type TerminalColor,
} from "./terminal-branding";

type NetworkName = "mainnet" | "testnet";
type Command = "register" | "show" | "validate";

const args = new Set(process.argv.slice(2));
const command = (process.argv[2] || "show") as Command;
const cinematicMode = args.has("--cinematic");
const network: NetworkName | undefined = args.has("--mainnet")
  ? "mainnet"
  : args.has("--testnet")
    ? "testnet"
    : undefined;
const broadcast = args.has("--broadcast");
const confirmation = process.argv[process.argv.indexOf("--confirm") + 1];

const networkConfig = {
  mainnet: {
    chainId: 4663,
    rpcUrl: process.env.ROBINHOOD_MAINNET_RPC_URL?.trim()
      || process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL?.trim()
      || "https://rpc.mainnet.chain.robinhood.com",
    explorerUrl: "https://robinhoodchain.blockscout.com",
    directoryAddress: process.env.YELTRA_MARKET_DIRECTORY?.trim(),
    confirmation: MARKET_DIRECTORY_CONFIRMATION,
  },
  testnet: {
    chainId: 46630,
    rpcUrl: process.env.ROBINHOOD_TESTNET_RPC_URL?.trim()
      || process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL?.trim()
      || "https://rpc.testnet.chain.robinhood.com",
    explorerUrl: "https://explorer.testnet.chain.robinhood.com",
    directoryAddress: process.env.YELTRA_MARKET_DIRECTORY_TESTNET?.trim(),
    confirmation: "YELTRA_MARKET_TESTNET_REGISTER_46630",
  },
} as const;

const accessManagerAbi = [
  {
    name: "hasRole",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;

const ADMIN_ROLE = keccak256(stringToHex("CLEAVE_ADMIN"));
const OPERATOR_ROLE = keccak256(stringToHex("CLEAVE_OPERATOR"));

const LABEL_WIDTH = 38;
const RULE_WIDTH = 66;
const useColor = Boolean(process.stdout.isTTY);

function paint(value: string, color: TerminalColor): string {
  return terminalPaint(value, color, useColor);
}

function subtitleForCommand(value: Command): string {
  if (value === "show") return "MARKET DIRECTORY AUDIT";
  if (value === "validate") return "MARKET VALIDATION";
  return "MARKET REGISTRATION";
}

function networkTitle(value: NetworkName): string {
  return value === "mainnet"
    ? "ROBINHOOD CHAIN MAINNET"
    : "ROBINHOOD CHAIN TESTNET";
}

async function header(commandName: Command): Promise<void> {
  console.log();
  for (const row of renderYeltraLogo(useColor)) console.log(row);
  await cinematicPause(500, cinematicMode);
  console.log();
  console.log(paint(centerYeltraText("YELTRA MARKET / DIRECTORY AUDIT"), "dim"));
  console.log(renderTerminalDivider(RULE_WIDTH, useColor));
  console.log(paint("MARKET DIRECTORY · ROBINHOOD CHAIN", "ice"));
  console.log(renderTerminalDivider(RULE_WIDTH, useColor));
  await cinematicPause(350, cinematicMode);
  console.log();
  console.log(paint(subtitleForCommand(commandName), "dim"));
}

function section(title: string): void {
  console.log();
  console.log(paint(`◆ ${title}`, "yeltraBlue"));
  console.log(renderTerminalDivider(RULE_WIDTH, useColor));
}

function valueColor(value: string): TerminalColor {
  if (value.includes("FAIL") || value.includes("REVERTED")) return "red";
  if (
    value.includes("UNAVAILABLE") ||
    value.includes("NOT CONFIGURED") ||
    value.includes("NOT AVAILABLE") ||
    value.includes("NOT VERIFIED") ||
    value.includes("REQUIRED") ||
    value.includes("BLOCKED") ||
    value.includes("NOT SENT") ||
    value.includes("NOT BROADCAST") ||
    value.includes("NOT CHECKED")
  ) {
    return "yellow";
  }
  if (
    value.includes("PASS") ||
    value.includes("VALID") ||
    value.includes("READY") ||
    value.includes("REGISTERED") ||
    value.includes("NO")
  ) {
    return "green";
  }
  return "white";
}

function line(label: string, value: string): void {
  const paddedLabel = `${label} `.padEnd(LABEL_WIDTH, " ");
  console.log(`${paint(paddedLabel, "dim")}${paint(value, valueColor(value))}`);
}

function check(label: string, passed: boolean): void {
  const marker = passed ? "✓" : "✕";
  const tone = passed ? "green" : "red";
  console.log(`${paint(`  ${marker}`, tone)} ${paint(label, "white")} ${paint(passed ? "PASS" : "FAIL", tone)}`);
}

type CinematicResult = {
  text: string;
  tone: "green" | "yellow" | "red";
};

async function cinematicStep(
  label: string,
  results: CinematicResult[],
  pauseMilliseconds: number,
): Promise<void> {
  if (!cinematicMode) return;

  console.log();
  console.log(paint(`→ ${label}`, "dim"));
  await cinematicPause(140, cinematicMode);
  for (const result of results) {
    const marker = result.tone === "green" ? "✓" : result.tone === "yellow" ? "!" : "✕";
    console.log(`${paint(marker, result.tone)} ${paint(result.text, "white")}`);
  }
  await cinematicPause(pauseMilliseconds, cinematicMode);
}

async function renderCinematicAudit(
  networkName: NetworkName,
  candidate: MarketDirectoryEntry,
  snapshot: Awaited<ReturnType<MorphoYieldMarketAdapter["readVault"]>> | undefined,
  directoryAddress: Address | undefined,
  directoryState: Awaited<ReturnType<typeof readDirectoryState>> | undefined,
): Promise<void> {
  if (!cinematicMode) return;

  console.log();
  console.log(paint("INITIALIZING MARKET AUDIT", "dim"));
  await cinematicPause(300, cinematicMode);

  await cinematicStep(
    "Resolving Robinhood Chain network",
    [{
      text: networkName === "mainnet" ? "Robinhood Chain Mainnet" : "Robinhood Chain Testnet",
      tone: "green",
    }],
    250,
  );
  await cinematicStep(
    "Resolving market provider",
    [{ text: directoryLabel(candidate.providerId), tone: "green" }],
    300,
  );
  await cinematicStep(
    "Inspecting market contract",
    [{ text: "Contract bytecode found", tone: snapshot?.bytecodePresent ? "green" : "red" }],
    300,
  );
  await cinematicStep(
    "Resolving underlying asset",
    [
      { text: snapshot?.underlyingSymbol || "Underlying asset unavailable", tone: snapshot ? "green" : "red" },
      { text: "Underlying asset mapping verified", tone: snapshot ? "green" : "red" },
    ],
    300,
  );
  await cinematicStep(
    "Inspecting vault configuration",
    [
      { text: snapshot?.name || "Vault configuration unavailable", tone: snapshot ? "green" : "red" },
      { text: "ERC-4626 compatible", tone: snapshot ? "green" : "red" },
      { text: "Asset mapping verified", tone: snapshot ? "green" : "red" },
    ],
    350,
  );
  await cinematicStep(
    "Reading live vault state",
    [
      { text: "Total assets resolved", tone: snapshot ? "green" : "red" },
      { text: "Total shares resolved", tone: snapshot ? "green" : "red" },
      { text: "Share conversion resolved", tone: snapshot ? "green" : "red" },
    ],
    350,
  );
  await cinematicStep(
    "Checking YELTRA Market Directory",
    directoryAddress
      ? directoryState?.duplicate
        ? [{ text: "Market already registered", tone: "yellow" }]
        : [{ text: "Directory reachable; market not registered", tone: "green" }]
      : [{ text: "Directory not configured", tone: "yellow" }],
    450,
  );
  await cinematicPause(400, cinematicMode);
}

function finalStatus(value: string): void {
  const [primary, ...continuation] = value.split(" · ");
  line("FINAL STATUS", primary);
  if (continuation.length) line("", continuation.join(" · "));
  console.log();
  console.log(paint("─".repeat(RULE_WIDTH), "dim"));
}

async function emitFinalStatus(value: string): Promise<void> {
  await cinematicPause(500, cinematicMode);
  finalStatus(value);
  await cinematicPause(700, cinematicMode);
}

function getClient(config: (typeof networkConfig)[NetworkName]): PublicClient {
  return createPublicClient({
    chain: config.chainId === 4663 ? robinhoodChain : robinhoodChainTestnet,
    transport: http(config.rpcUrl),
  });
}

function validAddress(value: string | undefined): Address | undefined {
  return value && isAddress(value) ? value : undefined;
}

function candidateForNetwork(chainId: number): MarketDirectoryEntry {
  return {
    ...MORPHO_STEAKHOUSE_USDG_ENTRY,
    marketId: getDirectoryMarketId(
      MARKET_DIRECTORY_PROVIDER_IDS.MORPHO,
      chainId,
      MORPHO_STEAKHOUSE_USDG_ENTRY.marketAddress,
    ),
    chainId,
    registeredAt: BigInt(0),
  };
}

async function readDirectoryState(
  client: PublicClient,
  directoryAddress: Address,
  candidate: MarketDirectoryEntry,
): Promise<{ entries: MarketDirectoryEntry[]; duplicate: boolean; accessManager: Address }> {
  const entries = await readYeltraMarketDirectory(client, directoryAddress);
  const duplicate = entries.some(
    (entry) => entry.marketId.toLowerCase() === candidate.marketId.toLowerCase()
      || entry.marketAddress.toLowerCase() === candidate.marketAddress.toLowerCase(),
  );
  const accessManager = await client.readContract({
    address: directoryAddress,
    abi: yeltraMarketDirectoryAbi,
    functionName: "accessManager",
  });
  return { entries, duplicate, accessManager };
}

async function validateCandidate(client: PublicClient, chainId: number): Promise<{
  candidate: MarketDirectoryEntry;
  snapshot?: Awaited<ReturnType<MorphoYieldMarketAdapter["readVault"]>>;
}> {
  const candidate = candidateForNetwork(chainId);
  const actualChainId = await client.getChainId();
  if (actualChainId !== chainId) throw new Error(`Wrong chain: expected ${chainId}, received ${actualChainId}.`);
  if (chainId !== 4663) {
    throw new Error("The prepared Morpho Steakhouse USDG market is Mainnet-only; no Testnet candidate is configured.");
  }

  const snapshot = await new MorphoYieldMarketAdapter(client).readVault(candidate);
  const validation = validateExternalMarketCandidate({
    chainId: actualChainId,
    expectedChainId: chainId,
    providerId: candidate.providerId,
    marketType: candidate.marketType,
    marketAddress: candidate.marketAddress,
    underlyingAsset: String(await client.readContract({
      address: candidate.marketAddress,
      abi: [{ name: "asset", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }] as const,
      functionName: "asset",
    })) as Address,
    expectedUnderlying: candidate.underlyingAsset,
    bytecodePresent: snapshot.bytecodePresent,
  });
  if (!validation.ok) throw new Error(`Candidate validation failed: ${validation.reason}.`);
  return { candidate, snapshot };
}

async function run(): Promise<void> {
  if (!network || !["register", "show", "validate"].includes(command)) {
    throw new Error("Usage: bun market:<register|show|validate> --mainnet|--testnet [--broadcast --confirm <value>]");
  }
  if (broadcast && command !== "register") throw new Error("--broadcast is only valid for market:register.");

  const config = networkConfig[network];
  await header(command);
  const client = getClient(config);
  let validated: Awaited<ReturnType<typeof validateCandidate>>;
  try {
    validated = await validateCandidate(client, config.chainId);
  } catch (error) {
    section("VALIDATION");
    line("STATUS", "FAIL");
    line("REASON", error instanceof Error ? error.message : "UNAVAILABLE");
    line("REGISTRATION", "NOT SENT");
    await emitFinalStatus("BLOCKED · VALIDATION FAILED");
    process.exitCode = 1;
    return;
  }
  const { candidate, snapshot } = validated;
  const directoryAddress = validAddress(config.directoryAddress);
  const directoryState = directoryAddress
    ? await readDirectoryState(client, directoryAddress, candidate)
    : undefined;

  await renderCinematicAudit(
    network,
    candidate,
    snapshot,
    directoryAddress,
    directoryState,
  );

  section("NETWORK");
  line("MODE", broadcast ? "BROADCAST REQUEST" : "DRY RUN / SIMULATION");
  line("NETWORK", networkTitle(network));
  line("CHAIN ID", String(config.chainId));

  section("MARKET");
  line("PROVIDER", "MORPHO");
  line("MARKET", snapshot?.name || "Steakhouse USDG");
  line("MARKET TYPE", "VAULT");
  line("MARKET ADDRESS", candidate.marketAddress);
  line("UNDERLYING", `USDG · ${candidate.underlyingAsset}`);

  section("VAULT STATE");
  line("VAULT DECIMALS", String(snapshot?.vaultDecimals ?? "UNAVAILABLE"));
  line("UNDERLYING DECIMALS", String(snapshot?.underlyingDecimals ?? "UNAVAILABLE"));
  line("TOTAL ASSETS", snapshot?.totalAssets.toString() || "UNAVAILABLE");
  line("TOTAL SHARES", snapshot?.totalSupply.toString() || "UNAVAILABLE");
  line("SHARE CONVERSION", snapshot?.shareConversion.toString() || "UNAVAILABLE");
  line("ASSETS PER SHARE", snapshot?.assetsPerShare.toString() || "UNAVAILABLE");
  line("CURRENT APY / RATE", "UNAVAILABLE · NO DETERMINISTIC VAULT RATE SELECTOR");
  line("LIQUIDITY", "UNAVAILABLE · TOTAL ASSETS IS NOT ASSERTED AS EXIT LIQUIDITY");

  section("MARKET DIRECTORY");
  line("YELTRA DIRECTORY", directoryAddress || "NOT CONFIGURED");
  line(
    "DIRECTORY DUPLICATE",
    directoryState?.duplicate
      ? "YES · REGISTRATION BLOCKED"
      : directoryState
        ? "NO"
        : "NOT CHECKED",
  );

  if (command === "show") {
    section("DIRECTORY AUDIT");
    check("Contract bytecode", Boolean(snapshot?.bytecodePresent));
    check("Underlying asset", true);
    check("Vault compatibility", Boolean(snapshot));
    check("Chain validation", true);
    line("REGISTRATION", "NOT SENT · SHOW IS READ-ONLY");
    line(
      "EXPLORER",
      directoryAddress
        ? `${config.explorerUrl}/address/${candidate.marketAddress}`
        : "NOT AVAILABLE",
    );
    await emitFinalStatus(
      directoryState?.duplicate
        ? "ALREADY REGISTERED"
        : directoryAddress
          ? "READY FOR EXPLICIT REGISTER"
          : "DIRECTORY REQUIRED",
    );
    return;
  }

  if (command === "validate") {
    section("VALIDATION");
    check("Contract bytecode", Boolean(snapshot?.bytecodePresent));
    check("Underlying asset", true);
    check("Vault compatibility", Boolean(snapshot));
    check("Chain validation", true);
    line("VALIDATION", "VALIDATED");
    line(
      "REGISTRATION",
      directoryState?.duplicate
        ? "BLOCKED · DUPLICATE MARKET"
        : directoryAddress
          ? "NOT BROADCAST"
          : "NOT SENT",
    );
    await emitFinalStatus(
      directoryState?.duplicate
        ? "DUPLICATE · NOT REGISTERABLE"
        : directoryAddress
          ? "VALID · NOT BROADCAST"
          : "VALID CANDIDATE · DIRECTORY REQUIRED",
    );
    return;
  }

  section("REGISTRATION");
  if (!directoryAddress) {
    line("REGISTRATION", "NOT SENT");
    await emitFinalStatus("BLOCKED · YELTRA DIRECTORY ADDRESS REQUIRED");
    return;
  }
  if (directoryState?.duplicate) {
    line("REGISTRATION", "NOT SENT");
    await emitFinalStatus("BLOCKED · MARKET ALREADY REGISTERED");
    return;
  }

  const privateKey = (network === "mainnet"
    ? process.env.MAINNET_DEPLOYER_PRIVATE_KEY
    : process.env.TESTNET_DEPLOYER_PRIVATE_KEY)?.trim() as Hex | undefined;
  const account = privateKey ? privateKeyToAccount(privateKey) : undefined;
  const role = account
    ? (await client.readContract({
        address: directoryState!.accessManager,
        abi: accessManagerAbi,
        functionName: "hasRole",
        args: [ADMIN_ROLE, account.address],
      })) || (await client.readContract({
        address: directoryState!.accessManager,
        abi: accessManagerAbi,
        functionName: "hasRole",
        args: [OPERATOR_ROLE, account.address],
    }))
    : false;
  line("OPERATOR", account?.address || "NOT CONFIGURED");
  line("ACCESS ROLE", role ? "PASS" : "NOT VERIFIED");

  if (!broadcast) {
    line("REGISTRATION", "NOT SENT · DRY RUN / SIMULATION");
    await emitFinalStatus(
      role
        ? "READY · ADD --BROADCAST AND CONFIRMATION"
        : "BLOCKED · OPERATOR ROLE / KEY REQUIRED",
    );
    return;
  }
  if (!account || !role) throw new Error("Broadcast requires a configured operator key with directory access.");
  if (confirmation !== config.confirmation) throw new Error(`Broadcast requires --confirm ${config.confirmation}.`);

  const walletClient = createWalletClient({ account, chain: config.chainId === 4663 ? robinhoodChain : robinhoodChainTestnet, transport: http(config.rpcUrl) });
  const gas = await client.estimateContractGas({
    address: directoryAddress,
    abi: yeltraMarketDirectoryAbi,
    functionName: "registerMarket",
    args: [candidate.marketId, candidate.providerId, candidate.marketType, candidate.marketAddress, candidate.underlyingAsset, BigInt(config.chainId)],
    account,
  });
  line("ESTIMATED GAS", gas.toString());
  line("VALIDATION", "REGISTERING");
  const hash = await walletClient.writeContract({
    address: directoryAddress,
    abi: yeltraMarketDirectoryAbi,
    functionName: "registerMarket",
    args: [candidate.marketId, candidate.providerId, candidate.marketType, candidate.marketAddress, candidate.underlyingAsset, BigInt(config.chainId)],
    account,
  });
  line("REGISTRATION TX", hash);
  line("EXPLORER", `${config.explorerUrl}/tx/${hash}`);
  const receipt = await client.waitForTransactionReceipt({ hash });
  await emitFinalStatus(receipt.status === "success" ? "REGISTERED" : "REVERTED");
}

await run();
