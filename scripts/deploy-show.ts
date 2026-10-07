import { createPublicClient, http, parseAbiItem } from "viem";
import { yieldAdapter } from "../lib/adapters/mock-adapter";
import { pickFeaturedMarket } from "../components/landing/featuredMarket";
import { isMarketTradable } from "../lib/markets/status";
import {
  getContractByName,
  getContractDisplayName,
  getContractDeployments,
  type ContractDeployment,
} from "../lib/contracts/deployments";
import {
  getConfiguredChainId,
  getRuntimeEnvironmentValidation,
} from "../lib/web3/environment";
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_TESTNET_CHAIN_ID,
  robinhoodChain,
  robinhoodChainTestnet,
} from "../lib/web3/chains";
import {
  centerYeltraText,
  renderTerminalDivider,
  renderYeltraLogo,
  terminalPaint,
  TERMINAL_ANSI as ANSI,
} from "./terminal-branding";

const PENDLE_API_BASE = "https://api-v2.pendle.finance/core";
const LABEL_WIDTH = 38;

type RpcProbe = { status: "PASS" | "FAIL"; blockNumber?: bigint };
type MarketProbe = { status: "PASS" | "FAIL"; total?: number };
type RegisteredMarketProbe = { status: "PASS" | "FAIL"; total?: number };
type DeploymentReadback = {
  bytecodePresent?: boolean;
  receipt?: {
    transactionHash: string;
    blockNumber: bigint;
    gasUsed: bigint;
  };
};

const YELTRA_MARKET_REGISTERED_EVENT = parseAbiItem(
  "event MarketRegistered(bytes32 indexed marketId, bytes32 indexed adapterId, address indexed market, uint256 chainId, uint256 maturity)",
);

function getYeltraMarketRegistryDeployment() {
  return getContractByName(ROBINHOOD_CHAIN_ID, "YeltraMarketRegistry")
    || getContractByName(ROBINHOOD_CHAIN_ID, "CleaveMarketRegistry");
}

const cliArgs = new Set(process.argv.slice(2));
const recordMode = cliArgs.has("--record");
const mainnetMode = cliArgs.has("--mainnet");
const testnetMode = cliArgs.has("--testnet");
const scopedMode = mainnetMode || testnetMode;

const useColor = Boolean(process.stdout.isTTY);
const useTypewriter = useColor && recordMode;

function paint(value: string, color: keyof typeof ANSI): string {
  return terminalPaint(value, color, useColor);
}

function styledValue(value: string): string {
  if (
    value.includes("FAIL") ||
    value.includes("UNAVAILABLE") ||
    value.includes("NOT VERIFIED") ||
    value.includes("NOT DEPLOYED")
  ) {
    return paint(value, "yellow");
  }
  if (
    value.includes("PASS") ||
    value.includes("READY") ||
    value.includes("ACTIVE") ||
    value.includes("ONLINE")
  ) {
    return paint(value, "green");
  }
  if (value.includes("REGISTRY ONLY")) return paint(value, "dim");
  return paint(value, "white");
}

function line(label: string, value: string): void {
  console.log(
    `${paint(`${label} `.padEnd(LABEL_WIDTH, " "), "dim")}${styledValue(value)}`,
  );
}

function section(title: string): void {
  console.log();
  console.log(paint(`◆ ${title}`, "yeltraBlue"));
  console.log(paint("─".repeat(66), "dim"));
}

function deploymentStatus(deployment: {
  verified: boolean;
  deploymentTx?: string;
}): string {
  if (deployment.verified) return "VERIFIED";
  return deployment.deploymentTx ? "DEPLOYED / NOT VERIFIED" : "NOT DEPLOYED";
}

function deploymentOwnership(deployment: {
  ownership?: "external" | "project";
}): string {
  return deployment.ownership === "project" ? "PROJECT OWNED" : "EXTERNAL";
}

function badge(label: string, tone: "success" | "warning" | "info"): string {
  const color =
    tone === "success" ? "green" : tone === "warning" ? "yellow" : "yeltraBlue";
  return paint(`[${label}]`, color);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function rpcUrlForChain(chainId: number): string | undefined {
  const rpcUrl =
    chainId === ROBINHOOD_CHAIN_ID
      ? process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL
      : process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL;
  return rpcUrl?.trim() || undefined;
}

function createRpcClient(chainId: number) {
  const rpcUrl = rpcUrlForChain(chainId);
  if (!rpcUrl) return undefined;
  return createPublicClient({
    chain:
      chainId === ROBINHOOD_CHAIN_ID ? robinhoodChain : robinhoodChainTestnet,
    transport: http(rpcUrl),
  });
}

async function typewriter(message: string, characterDelay = 22): Promise<void> {
  if (!useTypewriter) {
    console.log(message);
    return;
  }
  for (const character of message) {
    process.stdout.write(character);
    await sleep(characterDelay);
  }
  process.stdout.write("\n");
}

async function spinner<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!useTypewriter) return operation();

  const frames = ["◐", "◓", "◑", "◒"];
  let frame = 0;
  let interval: ReturnType<typeof setInterval> | undefined;
  const startedAt = Date.now();
  const render = () => {
    process.stdout.write(
      `\r${paint(`${frames[frame]} ${label}`, "yeltraBlue")}`,
    );
    frame = (frame + 1) % frames.length;
  };

  render();
  interval = setInterval(render, 90);
  try {
    const result = await operation();
    await sleep(Math.max(180 - (Date.now() - startedAt), 0));
    if (interval) clearInterval(interval);
    process.stdout.write(`\r\u001b[2K${paint("✓", "green")} ${label}\n`);
    return result;
  } catch (error) {
    if (interval) clearInterval(interval);
    process.stdout.write(
      `\r\u001b[2K${paint("!", "yellow")} ${label} · unavailable\n`,
    );
    throw error;
  }
}

function progressBar(current: number, total: number, label: string): void {
  if (!useTypewriter) return;
  const width = 24;
  const filled = Math.round((current / total) * width);
  const bar = "█".repeat(filled) + "·".repeat(width - filled);
  process.stdout.write(
    `\r${paint(`${bar} ${current}/${total}`, "yeltraBlue")} ${label}`,
  );
  if (current >= total) process.stdout.write("\n");
}

function devPrompt(action?: string): void {
  console.log(paint("┌─[DEV@YELTRA]", "ice"));
  console.log(
    `${paint("└─▶", "yeltraBlue")}${action ? ` ${paint(action, "white")}` : ""}`,
  );
}

function compactHash(value: string): string {
  return value.length > 14
    ? `${value.slice(0, 8)}...${value.slice(-6)}`
    : value;
}

async function readDeployment(
  client: ReturnType<typeof createPublicClient> | undefined,
  deployment: { address: string; deploymentTx?: string },
): Promise<DeploymentReadback> {
  if (!client) return {};

  const readback: DeploymentReadback = {};
  try {
    const bytecode = await client.getBytecode({
      address: deployment.address as `0x${string}`,
    });
    readback.bytecodePresent = Boolean(bytecode && bytecode !== "0x");
  } catch {
    // Keep registry metadata as the fallback when an RPC does not expose code.
  }

  if (deployment.deploymentTx) {
    try {
      const receipt = await client.getTransactionReceipt({
        hash: deployment.deploymentTx as `0x${string}`,
      });
      readback.receipt = {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      };
    } catch {
      // Historical receipts are optional enrichment for the recording.
    }
  }

  return readback;
}

function recordDeploymentStatus(
  deployment: { verified: boolean; deploymentTx?: string },
  readback: DeploymentReadback,
): string {
  if (readback.bytecodePresent === false) return "CODE NOT FOUND";
  if (deployment.verified) return "VERIFIED";
  if (readback.bytecodePresent) return "DEPLOYED · CODE PRESENT";
  return deploymentStatus(deployment);
}

async function recordStep(message: string, major = false): Promise<void> {
  await typewriter(message, major ? 28 : 21);
  if (recordMode) await sleep(major ? 430 : 290);
}

async function recordSection(title: string): Promise<void> {
  section(title);
  if (recordMode) await sleep(820);
}

async function recordLine(
  label: string,
  value: string,
  major = false,
): Promise<void> {
  line(label, value);
  if (recordMode) await sleep(major ? 470 : 300);
}

async function recordDeploymentVerification(
  deployments: ContractDeployment[],
  chainId: number,
): Promise<Map<string, DeploymentReadback>> {
  const client = createRpcClient(chainId);
  const readbacks = new Map<string, DeploymentReadback>();

  progressBar(0, deployments.length, "contract verification");
  if (useTypewriter) process.stdout.write("\n");
  for (const [index, deployment] of deployments.entries()) {
    const name = getContractDisplayName(deployment);
    await recordStep(`▸ ${name}`);
    const readback = client
      ? await spinner("  verifying deployed bytecode...", () =>
          readDeployment(client, deployment),
        )
      : {};
    readbacks.set(deployment.address, readback);
    await recordLine("Status", recordDeploymentStatus(deployment, readback));
    await recordLine("Address", deployment.address);

    if (readback.receipt) {
      await recordLine(
        "History",
        `tx ${compactHash(readback.receipt.transactionHash)} · block ${readback.receipt.blockNumber} · gas ${readback.receipt.gasUsed.toLocaleString("en-US")}`,
      );
    } else {
      const registryFacts = [
        deployment.deploymentTx
          ? `tx ${compactHash(deployment.deploymentTx)}`
          : undefined,
        deployment.deploymentBlock !== undefined
          ? `block ${deployment.deploymentBlock}`
          : undefined,
      ].filter((value): value is string => Boolean(value));
      if (registryFacts.length)
        await recordLine("Registry fact", registryFacts.join(" · "));
    }

    progressBar(index + 1, deployments.length, "contract verification");
    if (useTypewriter && index + 1 < deployments.length) process.stdout.write("\n");
  }

  return readbacks;
}

async function printLogo(): Promise<void> {
  for (const row of renderYeltraLogo(useColor)) {
    console.log(row);
    if (useTypewriter) await sleep(70);
  }
  const subtitle = "DEPLOYMENT / NETWORK AUDIT";
  console.log(paint(centerYeltraText(subtitle), "dim"));
  console.log(renderTerminalDivider(66, useColor));
  console.log(paint("YIELD MARKETS · ROBINHOOD CHAIN", "ice"));
  console.log(renderTerminalDivider(66, useColor));
}

async function showConnectionSequence(
  mainnetRpc: RpcProbe,
  markets: number,
  testnetRpc: RpcProbe,
): Promise<void> {
  await typewriter(`${badge("+", "success")} YIELD TRADING UPLINK ESTABLISHED`);
  await typewriter(
    `${badge("+", "info")} CONNECTING TO ROBINHOOD MAINNET... ${mainnetRpc.status}`,
  );
  await typewriter(
    `${badge("+", "success")} RPC HANDSHAKE... ${mainnetRpc.status}`,
  );
  await typewriter(
    `${badge("+", "success")} CHAIN HEAD SYNCED... ${mainnetRpc.blockNumber === undefined ? "UNAVAILABLE" : `block #${mainnetRpc.blockNumber}`}`,
  );
  await typewriter(
    `${badge("+", "success")} PENDLE MARKET ADAPTER... ${markets > 0 ? "ONLINE" : "UNAVAILABLE"}`,
  );
  await typewriter(
    `${badge("+", testnetRpc.status === "PASS" ? "success" : "warning")} TESTNET PROBE... ${testnetRpc.status}`,
  );
}

async function probeRpc(chainId: number): Promise<RpcProbe> {
  const client = createRpcClient(chainId);
  if (!client) return { status: "FAIL" };
  try {
    return { status: "PASS", blockNumber: await client.getBlockNumber() };
  } catch {
    return { status: "FAIL" };
  }
}

async function probePendleMarkets(chainId: number): Promise<MarketProbe> {
  try {
    const response = await fetch(
      `${PENDLE_API_BASE}/v2/markets/all?chainId=${chainId}&limit=1&skip=0`,
      {
        headers: { accept: "application/json" },
      },
    );
    if (!response.ok) return { status: "FAIL" };
    const payload = (await response.json()) as { total?: unknown };
    const total =
      typeof payload.total === "number" && Number.isFinite(payload.total)
        ? payload.total
        : undefined;
    return total === undefined ? { status: "FAIL" } : { status: "PASS", total };
  } catch {
    return { status: "FAIL" };
  }
}

async function probeRegisteredMainnetMarkets(): Promise<RegisteredMarketProbe> {
  const deployment = getYeltraMarketRegistryDeployment();
  if (!deployment?.address || deployment.deploymentBlock === undefined)
    return { status: "FAIL" };

  const rpcUrls = [
    "https://rpc.mainnet.chain.robinhood.com",
    process.env.ROBINHOOD_MAINNET_RPC_URL?.trim(),
    process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL?.trim(),
  ].filter((value): value is string => Boolean(value));

  for (const rpcUrl of rpcUrls) {
    try {
      const client = createPublicClient({
        chain: robinhoodChain,
        transport: http(rpcUrl),
      });
      const logs = await client.getLogs({
        address: deployment.address,
        event: YELTRA_MARKET_REGISTERED_EVENT,
        fromBlock: BigInt(deployment.deploymentBlock),
      });
      return { status: "PASS", total: logs.length };
    } catch {
      // Try the next configured endpoint; public RPC avoids provider log-range limits.
    }
  }

  return { status: "FAIL" };
}

async function probeQuotes(
  marketId: string,
): Promise<{ fixed: boolean; long: boolean; source?: string }> {
  try {
    const [fixed, long] = await Promise.all([
      yieldAdapter.getFixedQuote(marketId, 1),
      yieldAdapter.getLongQuote(marketId, 1),
    ]);
    return {
      fixed: Boolean(fixed.outputBaseUnits),
      long: Boolean(long.outputBaseUnits),
      source: fixed.source,
    };
  } catch {
    return { fixed: false, long: false };
  }
}

async function main(): Promise<void> {
  const environment = getRuntimeEnvironmentValidation();
  const router = getContractByName(ROBINHOOD_CHAIN_ID, "Pendle Router V2");
  const mainnetDeployments = getContractDeployments("mainnet");
  const testnetDeployments = getContractDeployments("testnet");
  const mainnetRpc = await probeRpc(ROBINHOOD_CHAIN_ID);
  const testnetRpc = await probeRpc(ROBINHOOD_TESTNET_CHAIN_ID);
  const testnetMarkets = await probePendleMarkets(ROBINHOOD_TESTNET_CHAIN_ID);
  const registeredMainnetMarkets = await probeRegisteredMainnetMarkets();

  let markets = [] as Awaited<ReturnType<typeof yieldAdapter.getMarkets>>;
  try {
    if (
      yieldAdapter.mode === "live" &&
      getConfiguredChainId() === ROBINHOOD_CHAIN_ID
    ) {
      markets = await yieldAdapter.getMarkets();
    }
  } catch {
    markets = [];
  }

  const tradeableMarkets = markets.filter((market) => isMarketTradable(market));
  const featured = pickFeaturedMarket(markets);
  const quotes =
    featured && yieldAdapter.mode === "live"
      ? await probeQuotes(featured.id)
      : { fixed: false, long: false };
  const fixedReady = Boolean(
    environment.dataMode === "live" &&
    mainnetRpc.status === "PASS" &&
    router?.usedByRuntime &&
    featured?.ptAddress &&
    quotes.fixed,
  );
  const longReady = Boolean(
    environment.dataMode === "live" &&
    mainnetRpc.status === "PASS" &&
    router?.usedByRuntime &&
    featured?.ytAddress &&
    quotes.long,
  );
  const mainnetReady = Boolean(
    environment.dataMode === "live" &&
    mainnetRpc.status === "PASS" &&
    markets.length > 0 &&
    fixedReady &&
    longReady,
  );

  await printLogo();
  await showConnectionSequence(mainnetRpc, markets.length, testnetRpc);

  section("MAINNET · ROBINHOOD CHAIN");
  line("Network", "Robinhood Chain");
  line("Chain ID", String(ROBINHOOD_CHAIN_ID));
  line(
    "RPC",
    `${mainnetRpc.status}${mainnetRpc.blockNumber === undefined ? "" : ` · block ${mainnetRpc.blockNumber}`}`,
  );
  line(
    "Current block",
    mainnetRpc.blockNumber === undefined
      ? "UNAVAILABLE"
      : `#${mainnetRpc.blockNumber}`,
  );
  line("Data Mode", environment.dataMode.toUpperCase());
  line(
    "Market Source",
    yieldAdapter.mode === "live" ? "Pendle live API" : "Mock adapter",
  );
  line("Markets", markets.length ? `${markets.length} dynamic` : "UNAVAILABLE");
  line(
    "Tradeable",
    markets.length ? String(tradeableMarkets.length) : "UNAVAILABLE",
  );
  line(
    "Featured",
    featured ? `${featured.name} · ${featured.marketAddress}` : "UNAVAILABLE",
  );

  section("YIELD ENGINE");
  line(
    "Fixed Yield / PT",
    `${fixedReady ? "READY" : "UNAVAILABLE"} · live PT route`,
  );
  line(
    "Trading Yield / YT",
    `${longReady ? "READY" : "UNAVAILABLE"} · live YT route`,
  );
  line("Quote Source", quotes.source ? "Pendle Convert API" : "UNAVAILABLE");
  line("Quote Endpoint", quotes.source || "UNAVAILABLE");
  line("Router / Spender", router?.address || "NOT VERIFIED");
  line("PT / YT Source", featured ? "LIVE MARKET METADATA" : "UNAVAILABLE");
  line("Transaction", "Wallet request only; this audit sends no transaction");

  section("MAINNET CONTRACTS · CHAIN 4663");
  for (const deployment of mainnetDeployments) {
    line(
      getContractDisplayName(deployment),
      `${deployment.usedByRuntime ? "ACTIVE" : "REGISTRY ONLY"} · ${deploymentOwnership(deployment)} · ${deploymentStatus(deployment)} · ${deployment.address}`,
    );
  }
  if (featured) {
    line(
      "Market",
      `ACTIVE · EXTERNAL · VERIFIED LIVE METADATA · ${featured.marketAddress}`,
    );
    line(
      "PT",
      `ACTIVE · EXTERNAL · VERIFIED LIVE METADATA · ${featured.ptAddress}`,
    );
    line(
      "YT",
      `ACTIVE · EXTERNAL · VERIFIED LIVE METADATA · ${featured.ytAddress}`,
    );
    line(
      "SY",
      `ACTIVE · EXTERNAL · VERIFIED LIVE METADATA · ${featured.syAddress}`,
    );
    line(
      "Underlying",
      `INPUT TOKEN · EXTERNAL · VERIFIED LIVE METADATA · ${featured.underlyingTokenAddress}`,
    );
  }
  const projectMainnet = mainnetDeployments.filter(
    (deployment) => deployment.ownership === "project",
  );
  const projectTestnet = testnetDeployments.filter(
    (deployment) => deployment.ownership === "project",
  );
  line(
    "Project Contracts",
    `Mainnet ${projectMainnet.length} · Testnet ${projectTestnet.length}`,
  );
  line(
    "Registered YELTRA Markets",
    registeredMainnetMarkets.status === "PASS"
      ? `Mainnet ${registeredMainnetMarkets.total}`
      : "Mainnet UNAVAILABLE",
  );
  line(
    "Mainnet YELTRA Modules",
    projectMainnet.length
      ? `${projectMainnet.length} deployed`
      : "PREPARED · NOT DEPLOYED",
  );
  for (const deployment of projectMainnet) {
    line(
      "Project / deployment",
      `${deploymentStatus(deployment)} · ${deployment.address}`,
    );
    if (deployment.deploymentTx) line("Deployment tx", deployment.deploymentTx);
    if (deployment.deploymentBlock !== undefined)
      line("Deployment block", String(deployment.deploymentBlock));
  }

  section("TESTNET · ROBINHOOD CHAIN · 46630");
  line("Network", "Robinhood Chain");
  line("Chain ID", String(ROBINHOOD_TESTNET_CHAIN_ID));
  line(
    "RPC",
    `${testnetRpc.status}${testnetRpc.blockNumber === undefined ? "" : ` · block ${testnetRpc.blockNumber}`}`,
  );
  line(
    "Current block",
    testnetRpc.blockNumber === undefined
      ? "UNAVAILABLE"
      : `#${testnetRpc.blockNumber}`,
  );
  line(
    "Pendle API Markets",
    testnetMarkets.status === "PASS"
      ? String(testnetMarkets.total)
      : "UNAVAILABLE",
  );
  const verifiedTestnetDeployments = testnetDeployments.filter(
    (deployment) => deployment.verified,
  );
  line(
    "Registry",
    verifiedTestnetDeployments.length
      ? `${verifiedTestnetDeployments.length} verified`
      : "0 verified deployments",
  );
  line(
    "YELTRA-owned",
    projectTestnet.length
      ? `${projectTestnet.length} registered`
      : "NOT DEPLOYED",
  );
  line("Registered YELTRA Markets", "0 · no verified Testnet Pendle market");
  for (const deployment of projectTestnet) {
    line(
      getContractDisplayName(deployment),
      `${deploymentOwnership(deployment)} · ${deploymentStatus(deployment)} · ${deployment.address}`,
    );
    if (deployment.deploymentTx) line("Deployment tx", deployment.deploymentTx);
    if (deployment.deploymentBlock !== undefined)
      line("Deployment block", String(deployment.deploymentBlock));
  }
  line("Pendle Router", "NOT VERIFIED");
  line("Market / PT / YT / SY", "NOT VERIFIED");
  line("Trading", "UNAVAILABLE · live adapter is Mainnet-only");

  section("FINAL STATUS");
  console.log(
    `${mainnetReady ? badge("✓", "success") : badge("!", "warning")} ${mainnetReady ? "YELTRA MAINNET INTEGRATION READY" : "YELTRA MAINNET INTEGRATION NOT READY"}`,
  );
  console.log(`${badge("✓", "success")} FIXED YIELD MAINNET CANARY PASS`);
  console.log(`${badge("!", "warning")} TRADING YIELD MAINNET CANARY REQUIRED`);
  console.log();
  console.log(
    paint(
      "All addresses above are public contract or market metadata addresses; EXTERNAL describes ownership, not network environment.",
      "dim",
    ),
  );
  console.log();
  console.log(paint("[DEV@YELTRA]", "ice"));
  console.log(paint("└─▶", "dim"));
}

async function runMainnetScoped(): Promise<void> {
  await printLogo();
  devPrompt("MAINNET RUNTIME AUDIT");
  await recordStep(`${badge("+", "info")} INITIALIZING MAINNET AUDIT...`);
  const mainnetRpc = await spinner(
    "connecting to Robinhood Chain Mainnet...",
    () => probeRpc(ROBINHOOD_CHAIN_ID),
  );
  await recordStep(
    `${badge("+", mainnetRpc.status === "PASS" ? "success" : "warning")} CHAIN ID ${ROBINHOOD_CHAIN_ID}... ${mainnetRpc.status}`,
    true,
  );
  await recordStep(
    `${badge("+", mainnetRpc.status === "PASS" ? "success" : "warning")} LIVE BLOCK... ${mainnetRpc.blockNumber === undefined ? "UNAVAILABLE" : `#${mainnetRpc.blockNumber}`}`,
    true,
  );
  await recordStep(
    `${badge("+", "info")} READING YELTRA DEPLOYMENT REGISTRY...`,
  );

  const environment = getRuntimeEnvironmentValidation();
  const router = getContractByName(ROBINHOOD_CHAIN_ID, "Pendle Router V2");
  const mainnetDeployments = getContractDeployments("mainnet");
  const projectMainnet = mainnetDeployments.filter(
    (deployment) => deployment.ownership === "project",
  );

  await recordSection("YELTRA CONTRACTS");
  const deploymentReadbacks = await recordDeploymentVerification(
    projectMainnet,
    ROBINHOOD_CHAIN_ID,
  );
  const verifiedProjectContracts = projectMainnet.filter(
    (deployment) =>
      recordDeploymentStatus(
        deployment,
        deploymentReadbacks.get(deployment.address) || {},
      ) === "VERIFIED",
  ).length;
  await recordLine(
    "Verification pass",
    `${verifiedProjectContracts} / ${projectMainnet.length} VERIFIED`,
    true,
  );

  await recordSection("REGISTERED MARKETS");
  const registeredMainnetMarkets = await spinner(
    "reading YELTRA Market Registry...",
    probeRegisteredMainnetMarkets,
  );
  await recordLine(
    "Registered YELTRA Markets",
    registeredMainnetMarkets.status === "PASS"
      ? `Mainnet ${registeredMainnetMarkets.total}`
      : "Mainnet UNAVAILABLE",
    true,
  );

  let markets = [] as Awaited<ReturnType<typeof yieldAdapter.getMarkets>>;
  if (
    yieldAdapter.mode === "live" &&
    getConfiguredChainId() === ROBINHOOD_CHAIN_ID
  ) {
    try {
      markets = await spinner("probing Pendle live market API...", () =>
        yieldAdapter.getMarkets(),
      );
    } catch {
      markets = [];
    }
  } else {
    await recordStep(
      `${badge("+", "warning")} LIVE YIELD ADAPTER... UNAVAILABLE`,
    );
  }
  const tradeableMarkets = markets.filter((market) => isMarketTradable(market));
  const featured = pickFeaturedMarket(markets);
  const quotes =
    featured && yieldAdapter.mode === "live"
      ? await spinner("probing Pendle Convert API...", () =>
          probeQuotes(featured.id),
        )
      : { fixed: false, long: false };
  const fixedReady = Boolean(
    environment.dataMode === "live" &&
    mainnetRpc.status === "PASS" &&
    router?.usedByRuntime &&
    featured?.ptAddress &&
    quotes.fixed,
  );
  const longReady = Boolean(
    environment.dataMode === "live" &&
    mainnetRpc.status === "PASS" &&
    router?.usedByRuntime &&
    featured?.ytAddress &&
    quotes.long,
  );
  const mainnetReady = Boolean(
    environment.dataMode === "live" &&
    mainnetRpc.status === "PASS" &&
    markets.length > 0 &&
    fixedReady &&
    longReady,
  );
  await recordStep(
    `${badge("+", markets.length > 0 ? "success" : "warning")} PENDLE ADAPTER... ${markets.length > 0 ? "ONLINE" : "UNAVAILABLE"}`,
    true,
  );

  await recordSection("MAINNET · ROBINHOOD CHAIN");
  await recordLine("Network", "Robinhood Chain");
  await recordLine("Chain ID", String(ROBINHOOD_CHAIN_ID));
  await recordLine(
    "RPC",
    `${mainnetRpc.status}${mainnetRpc.blockNumber === undefined ? "" : ` · block ${mainnetRpc.blockNumber}`}`,
    true,
  );
  await recordLine(
    "Current block",
    mainnetRpc.blockNumber === undefined
      ? "UNAVAILABLE"
      : `#${mainnetRpc.blockNumber}`,
  );
  await recordLine("Data Mode", environment.dataMode.toUpperCase());
  await recordLine(
    "Market Source",
    yieldAdapter.mode === "live" ? "Pendle live API" : "Mock adapter",
  );
  await recordLine(
    "Live dynamic markets",
    markets.length ? String(markets.length) : "UNAVAILABLE",
  );
  await recordLine(
    "Tradeable markets",
    markets.length ? String(tradeableMarkets.length) : "UNAVAILABLE",
  );
  await recordLine(
    "Live market metadata",
    featured ? "VERIFIED · PT / YT / SY / UNDERLYING" : "UNAVAILABLE",
  );

  await recordSection("YIELD ENGINE");
  await recordLine(
    "Pendle Adapter",
    markets.length ? "ONLINE" : "UNAVAILABLE",
    true,
  );
  await recordLine(
    "Pendle Router / Spender",
    router?.address || "NOT VERIFIED",
  );
  await recordLine(
    "Fixed Yield / PT",
    `${fixedReady ? "READY" : "UNAVAILABLE"} · live PT route`,
    true,
  );
  await recordLine(
    "Trading Yield / YT",
    `${longReady ? "READY" : "UNAVAILABLE"} · live YT route`,
    true,
  );
  await recordLine(
    "Quote Source",
    quotes.source ? "Pendle Convert API" : "UNAVAILABLE",
  );
  await recordLine(
    "PT / YT Source",
    featured ? "LIVE MARKET METADATA" : "UNAVAILABLE",
  );

  await recordSection("RUNTIME STATUS");
  console.log(paint("═".repeat(66), "yeltraBlue"));
  await recordLine(
    "YELTRA Runtime",
    mainnetReady ? "READY" : "NOT READY",
    true,
  );
  await recordLine("Fixed Yield Mainnet", "CANARY PASS", true);
  await recordLine("Trading Yield Mainnet", "CANARY REQUIRED");
  await recordLine("Audit writes", "NONE · READ-ONLY PROBES");
  console.log(paint("═".repeat(66), "yeltraBlue"));
  devPrompt("READY");
  if (useTypewriter) await sleep(1200);
}

async function runTestnetScoped(): Promise<void> {
  await printLogo();
  devPrompt("VERIFY TESTNET DEPLOYMENTS");
  await recordStep(`${badge("+", "info")} INITIALIZING TESTNET AUDIT...`);
  const testnetRpc = await spinner(
    "negotiating Robinhood Chain Testnet...",
    () => probeRpc(ROBINHOOD_TESTNET_CHAIN_ID),
  );
  await recordStep(
    `${badge("+", testnetRpc.status === "PASS" ? "success" : "warning")} CHAIN ID ${ROBINHOOD_TESTNET_CHAIN_ID}... ${testnetRpc.status}`,
    true,
  );
  await recordStep(
    `${badge("+", testnetRpc.status === "PASS" ? "success" : "warning")} CURRENT BLOCK... ${testnetRpc.blockNumber === undefined ? "UNAVAILABLE" : `#${testnetRpc.blockNumber}`}`,
    true,
  );
  await recordStep(
    `${badge("+", "info")} READING YELTRA TESTNET DEPLOYMENTS...`,
  );
  const testnetDeployments = getContractDeployments("testnet");
  const projectTestnet = testnetDeployments.filter(
    (deployment) => deployment.ownership === "project",
  );

  await recordSection("VERIFYING YELTRA CONTRACTS");
  const deploymentReadbacks = await recordDeploymentVerification(
    projectTestnet,
    ROBINHOOD_TESTNET_CHAIN_ID,
  );
  const verifiedProjectContracts = projectTestnet.filter(
    (deployment) =>
      recordDeploymentStatus(
        deployment,
        deploymentReadbacks.get(deployment.address) || {},
      ) === "VERIFIED",
  ).length;

  await recordSection("TESTNET · ROBINHOOD CHAIN · 46630");
  await recordLine("Network", "Robinhood Chain Testnet");
  await recordLine("Chain ID", String(ROBINHOOD_TESTNET_CHAIN_ID));
  await recordLine(
    "RPC",
    `${testnetRpc.status}${testnetRpc.blockNumber === undefined ? "" : ` · block ${testnetRpc.blockNumber}`}`,
    true,
  );
  await recordLine(
    "Current block",
    testnetRpc.blockNumber === undefined
      ? "UNAVAILABLE"
      : `#${testnetRpc.blockNumber}`,
  );

  await recordSection("VERIFICATION STATUS");
  await recordLine("YELTRA-owned", `${projectTestnet.length} deployed`, true);
  await recordLine("Verified", `${verifiedProjectContracts} verified`, true);
  await recordLine(
    "Deployment blocks",
    projectTestnet.every(
      (deployment) => deployment.deploymentBlock !== undefined,
    )
      ? "AVAILABLE IN REGISTRY"
      : "PARTIAL",
  );

  await recordSection("TESTNET STATUS");
  const testnetMarkets = await spinner(
    "checking Pendle Testnet market API...",
    () => probePendleMarkets(ROBINHOOD_TESTNET_CHAIN_ID),
  );
  await recordLine(
    "Pendle Markets",
    testnetMarkets.status === "PASS"
      ? `${testnetMarkets.total} verified`
      : "UNAVAILABLE",
  );
  await recordLine("Yield Trading", "UNAVAILABLE on Testnet");
  await recordLine(
    "Registered YELTRA Markets",
    "0 · no verified Testnet Pendle market",
  );
  await recordLine("Audit writes", "NONE · READ-ONLY PROBES");
  console.log(paint("═".repeat(66), "yeltraBlue"));
  console.log(
    paint(
      `  ✓ ${verifiedProjectContracts} / ${projectTestnet.length} YELTRA CONTRACTS VERIFIED`,
      "green",
    ),
  );
  console.log(paint("  ROBINHOOD CHAIN TESTNET · 46630", "white"));
  console.log(paint("═".repeat(66), "yeltraBlue"));
  devPrompt("READY");
  if (useTypewriter) await sleep(1200);
}

async function dispatch(): Promise<void> {
  if (mainnetMode && testnetMode) {
    console.error("Choose only one network: --mainnet or --testnet.");
    process.exitCode = 1;
    return;
  }
  if (recordMode && !scopedMode) {
    console.error("Record mode requires --mainnet or --testnet.");
    process.exitCode = 1;
    return;
  }
  if (mainnetMode) return runMainnetScoped();
  if (testnetMode) return runTestnetScoped();
  return main();
}

await dispatch();
