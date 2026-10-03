import { createPublicClient, http } from "viem";
import { yieldAdapter } from "../lib/adapters/mock-adapter";
import { pickFeaturedMarket } from "../components/landing/featuredMarket";
import { isMarketTradable } from "../lib/markets/status";
import {
  getContractByName,
  getContractDeployments,
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

const PENDLE_API_BASE = "https://api-v2.pendle.finance/core";
const LABEL_WIDTH = 38;

type RpcProbe = { status: "PASS" | "FAIL"; blockNumber?: bigint };
type MarketProbe = { status: "PASS" | "FAIL"; total?: number };

const useColor = Boolean(process.stdout.isTTY);
const useTypewriter = useColor;
const ANSI = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  cyan: "\u001b[38;5;117m",
  ice: "\u001b[38;5;159m",
  green: "\u001b[38;5;120m",
  yellow: "\u001b[38;5;221m",
  white: "\u001b[38;5;255m",
};

function paint(value: string, color: keyof typeof ANSI): string {
  return useColor ? `${ANSI[color]}${value}${ANSI.reset}` : value;
}

function styledValue(value: string): string {
  if (value.includes("FAIL") || value.includes("UNAVAILABLE") || value.includes("NOT VERIFIED") || value.includes("NOT DEPLOYED")) {
    return paint(value, "yellow");
  }
  if (value.includes("PASS") || value.includes("READY") || value.includes("ACTIVE") || value.includes("ONLINE")) {
    return paint(value, "green");
  }
  if (value.includes("REGISTRY ONLY")) return paint(value, "dim");
  return paint(value, "white");
}

function line(label: string, value: string): void {
  console.log(`${paint(`${label} `.padEnd(LABEL_WIDTH, " "), "dim")}${styledValue(value)}`);
}

function section(title: string): void {
  console.log();
  console.log(paint(`◆ ${title}`, "cyan"));
  console.log(paint("─".repeat(66), "dim"));
}

function deploymentStatus(deployment: {
  verified: boolean;
  deploymentTx?: string;
}): string {
  if (deployment.verified) return "VERIFIED";
  return deployment.deploymentTx ? "DEPLOYED / NOT VERIFIED" : "NOT DEPLOYED";
}

function deploymentOwnership(deployment: { ownership?: "external" | "project" }): string {
  return deployment.ownership === "project" ? "PROJECT OWNED" : "EXTERNAL";
}

function badge(label: string, tone: "success" | "warning" | "info"): string {
  const color = tone === "success" ? "green" : tone === "warning" ? "yellow" : "cyan";
  return paint(`[${label}]`, color);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function typewriter(message: string): Promise<void> {
  if (!useTypewriter) {
    console.log(message);
    return;
  }
  for (const character of message) {
    process.stdout.write(character);
    await sleep(7);
  }
  process.stdout.write("\n");
}

async function showConnectionSequence(
  mainnetRpc: RpcProbe,
  markets: number,
  testnetRpc: RpcProbe,
): Promise<void> {
  await typewriter(`${badge("+", "success")} YIELD TRADING UPLINK ESTABLISHED`);
  await typewriter(`${badge("+", "info")} CONNECTING TO ROBINHOOD MAINNET... ${mainnetRpc.status}`);
  await typewriter(`${badge("+", "success")} RPC HANDSHAKE... ${mainnetRpc.status}`);
  await typewriter(`${badge("+", "success")} CHAIN HEAD SYNCED... ${mainnetRpc.blockNumber === undefined ? "UNAVAILABLE" : `block #${mainnetRpc.blockNumber}`}`);
  await typewriter(`${badge("+", "success")} PENDLE MARKET ADAPTER... ${markets > 0 ? "ONLINE" : "UNAVAILABLE"}`);
  await typewriter(`${badge("+", testnetRpc.status === "PASS" ? "success" : "warning")} TESTNET PROBE... ${testnetRpc.status}`);
}

async function probeRpc(chainId: number): Promise<RpcProbe> {
  const rpcUrl = chainId === ROBINHOOD_CHAIN_ID
    ? process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL
    : process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL;
  if (!rpcUrl?.trim()) return { status: "FAIL" };

  try {
    const client = createPublicClient({
      chain: chainId === ROBINHOOD_CHAIN_ID ? robinhoodChain : robinhoodChainTestnet,
      transport: http(rpcUrl.trim()),
    });
    return { status: "PASS", blockNumber: await client.getBlockNumber() };
  } catch {
    return { status: "FAIL" };
  }
}

async function probePendleMarkets(chainId: number): Promise<MarketProbe> {
  try {
    const response = await fetch(`${PENDLE_API_BASE}/v2/markets/all?chainId=${chainId}&limit=1&skip=0`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return { status: "FAIL" };
    const payload = await response.json() as { total?: unknown };
    const total = typeof payload.total === "number" && Number.isFinite(payload.total)
      ? payload.total
      : undefined;
    return total === undefined ? { status: "FAIL" } : { status: "PASS", total };
  } catch {
    return { status: "FAIL" };
  }
}

async function probeQuotes(marketId: string): Promise<{ fixed: boolean; long: boolean; source?: string }> {
  try {
    const [fixed, long] = await Promise.all([
      yieldAdapter.getFixedQuote(marketId, 1),
      yieldAdapter.getLongQuote(marketId, 1),
    ]);
    return { fixed: Boolean(fixed.outputBaseUnits), long: Boolean(long.outputBaseUnits), source: fixed.source };
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

  let markets = [] as Awaited<ReturnType<typeof yieldAdapter.getMarkets>>;
  try {
    if (yieldAdapter.mode === "live" && getConfiguredChainId() === ROBINHOOD_CHAIN_ID) {
      markets = await yieldAdapter.getMarkets();
    }
  } catch {
    markets = [];
  }

  const tradeableMarkets = markets.filter((market) => isMarketTradable(market));
  const featured = pickFeaturedMarket(markets);
  const quotes = featured && yieldAdapter.mode === "live"
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

  console.log(paint(" ██████╗██╗     ███████╗ █████╗ ██╗   ██╗███████╗", "cyan"));
  console.log(paint("██╔════╝██║     ██╔════╝██╔══██╗██║   ██║██╔════╝", "cyan"));
  console.log(paint("██║     ██║     █████╗  ███████║██║   ██║█████╗  ", "cyan"));
  console.log(paint("██║     ██║     ██╔══╝  ██╔══██║╚██╗ ██╔╝██╔══╝  ", "cyan"));
  console.log(paint("╚██████╗███████╗███████╗██║  ██║ ╚████╔╝ ███████╗", "cyan"));
  console.log(paint(" ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝", "cyan"));
  console.log(paint("                 DEPLOYMENT / NETWORK AUDIT", "dim"));
  await showConnectionSequence(mainnetRpc, markets.length, testnetRpc);

  section("MAINNET · ROBINHOOD CHAIN");
  line("Network", "Robinhood Chain");
  line("Chain ID", String(ROBINHOOD_CHAIN_ID));
  line("RPC", `${mainnetRpc.status}${mainnetRpc.blockNumber === undefined ? "" : ` · block ${mainnetRpc.blockNumber}`}`);
  line("Current block", mainnetRpc.blockNumber === undefined ? "UNAVAILABLE" : `#${mainnetRpc.blockNumber}`);
  line("Data Mode", environment.dataMode.toUpperCase());
  line("Market Source", yieldAdapter.mode === "live" ? "Pendle live API" : "Mock adapter");
  line("Markets", markets.length ? `${markets.length} dynamic` : "UNAVAILABLE");
  line("Tradeable", markets.length ? String(tradeableMarkets.length) : "UNAVAILABLE");
  line("Featured", featured ? `${featured.name} · ${featured.marketAddress}` : "UNAVAILABLE");

  section("YIELD ENGINE");
  line("Fixed Yield / PT", `${fixedReady ? "READY" : "UNAVAILABLE"} · live PT route`);
  line("Trading Yield / YT", `${longReady ? "READY" : "UNAVAILABLE"} · live YT route`);
  line("Quote Source", quotes.source ? "Pendle Convert API" : "UNAVAILABLE");
  line("Quote Endpoint", quotes.source || "UNAVAILABLE");
  line("Router / Spender", router?.address || "NOT VERIFIED");
  line("PT / YT Source", featured ? "LIVE MARKET METADATA" : "UNAVAILABLE");
  line("Transaction", "Wallet request only; this audit sends no transaction");

  section("MAINNET CONTRACTS · CHAIN 4663");
  for (const deployment of mainnetDeployments) {
    line(
      deployment.name,
      `${deployment.usedByRuntime ? "ACTIVE" : "REGISTRY ONLY"} · ${deploymentOwnership(deployment)} · ${deploymentStatus(deployment)} · ${deployment.address}`,
    );
  }
  if (featured) {
    line("Market", `ACTIVE · EXTERNAL · VERIFIED LIVE METADATA · ${featured.marketAddress}`);
    line("PT", `ACTIVE · EXTERNAL · VERIFIED LIVE METADATA · ${featured.ptAddress}`);
    line("YT", `ACTIVE · EXTERNAL · VERIFIED LIVE METADATA · ${featured.ytAddress}`);
    line("SY", `ACTIVE · EXTERNAL · VERIFIED LIVE METADATA · ${featured.syAddress}`);
    line("Underlying", `INPUT TOKEN · EXTERNAL · VERIFIED LIVE METADATA · ${featured.underlyingTokenAddress}`);
  }
  const projectMainnet = mainnetDeployments.filter((deployment) => deployment.ownership === "project");
  const projectTestnet = testnetDeployments.filter((deployment) => deployment.ownership === "project");
  line("Project Contracts", `Mainnet ${projectMainnet.length} · Testnet ${projectTestnet.length}`);
  for (const deployment of projectMainnet) {
    line("Project / deployment", `${deploymentStatus(deployment)} · ${deployment.address}`);
    if (deployment.deploymentTx) line("Deployment tx", deployment.deploymentTx);
    if (deployment.deploymentBlock !== undefined) line("Deployment block", String(deployment.deploymentBlock));
  }

  section("TESTNET · ROBINHOOD CHAIN · 46630");
  line("Network", "Robinhood Chain");
  line("Chain ID", String(ROBINHOOD_TESTNET_CHAIN_ID));
  line("RPC", `${testnetRpc.status}${testnetRpc.blockNumber === undefined ? "" : ` · block ${testnetRpc.blockNumber}`}`);
  line("Current block", testnetRpc.blockNumber === undefined ? "UNAVAILABLE" : `#${testnetRpc.blockNumber}`);
  line("Pendle API Markets", testnetMarkets.status === "PASS" ? String(testnetMarkets.total) : "UNAVAILABLE");
  const verifiedTestnetDeployments = testnetDeployments.filter((deployment) => deployment.verified);
  line("Registry", verifiedTestnetDeployments.length ? `${verifiedTestnetDeployments.length} verified` : "0 verified deployments");
  line("CLEAVE-owned", projectTestnet.length ? `${projectTestnet.length} registered` : "NOT DEPLOYED");
  for (const deployment of projectTestnet) {
    line("Project / deployment", `${deploymentStatus(deployment)} · ${deployment.address}`);
    if (deployment.deploymentTx) line("Deployment tx", deployment.deploymentTx);
    if (deployment.deploymentBlock !== undefined) line("Deployment block", String(deployment.deploymentBlock));
  }
  line("Pendle Router", "NOT VERIFIED");
  line("Market / PT / YT / SY", "NOT VERIFIED");
  line("Trading", "UNAVAILABLE · live adapter is Mainnet-only");

  section("FINAL STATUS");
  console.log(`${mainnetReady ? badge("✓", "success") : badge("!", "warning")} ${mainnetReady ? "CLEAVE MAINNET INTEGRATION READY" : "CLEAVE MAINNET INTEGRATION NOT READY"}`);
  console.log(`${badge("!", "warning")} REAL WALLET CANARY STILL REQUIRED`);
  console.log();
  console.log(paint("All addresses above are public contract or market metadata addresses; EXTERNAL describes ownership, not network environment.", "dim"));
  console.log();
  console.log(paint("[DEV@CLEAVE]", "ice"));
  console.log(paint("└─▶", "dim"));
}

await main();
