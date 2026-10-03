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

type RpcProbe = { status: "PASS" | "FAIL"; blockNumber?: bigint };
type MarketProbe = { status: "PASS" | "FAIL"; total?: number };

function line(label: string, value: string): void {
  console.log(`${`${label} `.padEnd(28, " ")}${value}`);
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

  console.log("╭────────────────────────────────────────────╮");
  console.log("│           CLEAVE DEPLOYMENT AUDIT           │");
  console.log("╰────────────────────────────────────────────╯");
  console.log();
  console.log("MAINNET");
  line("Network", "Robinhood Chain");
  line("Chain ID", String(ROBINHOOD_CHAIN_ID));
  line("RPC", `${mainnetRpc.status}${mainnetRpc.blockNumber === undefined ? "" : ` · block ${mainnetRpc.blockNumber}`}`);
  line("Data Mode", environment.dataMode.toUpperCase());
  line("Market Source", yieldAdapter.mode === "live" ? "Pendle live API" : "Mock adapter");
  line("Markets", markets.length ? `${markets.length} dynamic` : "UNAVAILABLE");
  line("Tradeable", markets.length ? String(tradeableMarkets.length) : "UNAVAILABLE");
  line("Featured", featured ? `${featured.name} · ${featured.marketAddress}` : "UNAVAILABLE");
  console.log();
  console.log("EXECUTION");
  line("Fixed", `${fixedReady ? "READY" : "UNAVAILABLE"} · live PT route`);
  line("Long", `${longReady ? "READY" : "UNAVAILABLE"} · live YT route`);
  line("Quote Source", quotes.source || "UNAVAILABLE");
  line("Router / Spender", router?.address || "NOT VERIFIED");
  line("PT / YT Source", featured ? "LIVE MARKET METADATA" : "UNAVAILABLE");
  line("Transaction", "Wallet request only; this audit sends no transaction");
  console.log();
  console.log("CONTRACTS · MAINNET 4663");
  for (const deployment of mainnetDeployments) {
    line(deployment.name, `${deployment.usedByRuntime ? "ACTIVE" : "REGISTRY ONLY"} · EXTERNAL · ${deployment.address}`);
  }
  if (featured) {
    line("Market", `ACTIVE · EXTERNAL · ${featured.marketAddress}`);
    line("PT", `ACTIVE · EXTERNAL · ${featured.ptAddress}`);
    line("YT", `ACTIVE · EXTERNAL · ${featured.ytAddress}`);
    line("SY", `ACTIVE · EXTERNAL · ${featured.syAddress}`);
    line("Underlying", `INPUT TOKEN · EXTERNAL · ${featured.underlyingTokenAddress}`);
  }
  line("Project Contracts", `Mainnet ${mainnetDeployments.filter((deployment) => deployment.ownership === "project").length} · Testnet ${testnetDeployments.filter((deployment) => deployment.ownership === "project").length}`);
  console.log();
  console.log("TESTNET");
  line("Network", "Robinhood Chain");
  line("Chain ID", String(ROBINHOOD_TESTNET_CHAIN_ID));
  line("RPC", `${testnetRpc.status}${testnetRpc.blockNumber === undefined ? "" : ` · block ${testnetRpc.blockNumber}`}`);
  line("Pendle API Markets", testnetMarkets.status === "PASS" ? String(testnetMarkets.total) : "UNAVAILABLE");
  line("Registry", testnetDeployments.length ? `${testnetDeployments.length} verified` : "0 verified deployments");
  line("Pendle Router", "NOT VERIFIED");
  line("Market / PT / YT / SY", "NOT VERIFIED");
  line("Trading", "UNAVAILABLE · live adapter is Mainnet-only");
  console.log();
  console.log("All addresses above are public contract or market metadata addresses; EXTERNAL describes ownership, not network environment.");
}

await main();
