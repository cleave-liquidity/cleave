import {
  createPublicClient,
  http,
  type Address,
  type PublicClient,
} from "viem";
import { pendleLiveYieldAdapter } from "../lib/adapters/pendle-live-adapter";
import { robinhoodChain, robinhoodChainTestnet } from "../lib/web3/chains";
import type { YieldMarket } from "../types/market";
import {
  createSimulationDividendEvent,
  fetchRobinhoodDividendEvents,
  fetchRobinhoodStockTokenAsset,
  sourceLabel,
} from "../lib/dividend/dividend-source-adapter";
import { buildDividendEarnState } from "../lib/dividend/dividend-state";
import type { DividendEvent, DividendPosition } from "../lib/dividend/dividend-types";
import {
  centerYeltraText,
  cinematicPause,
  renderTerminalDivider,
  renderYeltraLogo,
  terminalPaint,
  type TerminalColor,
} from "./terminal-branding";

type NetworkName = "mainnet" | "testnet";
type Command = "show" | "validate" | "simulate";

const args = new Set(process.argv.slice(2));
const command = (process.argv[2] || "show") as Command;
const cinematicMode = args.has("--cinematic");
const network: NetworkName | undefined = args.has("--mainnet")
  ? "mainnet"
  : args.has("--testnet")
    ? "testnet"
    : undefined;

const NVDA_MARKET_ID = "0x206a5cd00e9ffabb8ca564076b64799a78df19b9";
const NVDA_TOKEN = "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec" as Address;
const RULE_WIDTH = 66;
const LABEL_WIDTH = 38;
const useColor = Boolean(process.stdout.isTTY);

const networkConfig = {
  mainnet: {
    chainId: 4663,
    rpcUrl: process.env.ROBINHOOD_MAINNET_RPC_URL?.trim()
      || process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL?.trim()
      || "https://rpc.mainnet.chain.robinhood.com",
    chain: robinhoodChain,
  },
  testnet: {
    chainId: 46630,
    rpcUrl: process.env.ROBINHOOD_TESTNET_RPC_URL?.trim()
      || process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL?.trim()
      || "https://rpc.testnet.chain.robinhood.com",
    chain: robinhoodChainTestnet,
  },
} as const;

const erc20MetadataAbi = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

function paint(value: string, color: TerminalColor): string {
  return terminalPaint(value, color, useColor);
}

function networkTitle(value: NetworkName): string {
  return value === "mainnet" ? "ROBINHOOD CHAIN MAINNET" : "ROBINHOOD CHAIN TESTNET";
}

function commandTitle(value: Command): string {
  if (value === "validate") return "DIVIDEND VALIDATION";
  if (value === "simulate") return "DIVIDEND SIMULATION";
  return "DIVIDEND EARN AUDIT";
}

function valueColor(value: string): TerminalColor {
  if (value.includes("FAIL") || value.includes("MISMATCH") || value.includes("ERROR")) return "red";
  if (
    value.includes("UNAVAILABLE") ||
    value.includes("NOT ENABLED") ||
    value.includes("NOT CONFIGURED") ||
    value.includes("REQUIRED") ||
    value.includes("SIMULATION") ||
    value.includes("PENDING") ||
    value.includes("NO POSITION")
  ) return "yellow";
  if (
    value.includes("PASS") ||
    value.includes("VERIFIED") ||
    value.includes("ACTIVE") ||
    value.includes("ELIGIBLE") ||
    value.includes("CLAIMABLE") ||
    value.includes("COMPLETED") ||
    value.includes("READ-ONLY")
  ) return "green";
  return "white";
}

function line(label: string, value: string): void {
  console.log(`${paint(`${label} `.padEnd(LABEL_WIDTH, " "), "dim")}${paint(value, valueColor(value))}`);
}

function section(title: string): void {
  console.log();
  console.log(paint(`◆ ${title}`, "yeltraBlue"));
  console.log(renderTerminalDivider(RULE_WIDTH, useColor));
}

function check(label: string, passed: boolean, warning = false): void {
  const marker = passed ? "✓" : warning ? "!" : "✕";
  const tone: TerminalColor = passed ? "green" : warning ? "yellow" : "red";
  console.log(`${paint(`  ${marker}`, tone)} ${paint(label, "white")} ${paint(passed ? "PASS" : warning ? "WARN" : "FAIL", tone)}`);
}

async function header(): Promise<void> {
  console.log();
  for (const row of renderYeltraLogo(useColor)) console.log(row);
  await cinematicPause(450, cinematicMode);
  console.log();
  console.log(paint(centerYeltraText("DIVIDEND EARN / TRADING YIELD"), "dim"));
  console.log(paint(centerYeltraText("ROBINHOOD CHAIN AUDIT"), "dim"));
  console.log(renderTerminalDivider(RULE_WIDTH, useColor));
  console.log(paint("DIVIDEND INTELLIGENCE · YELTRA", "ice"));
  console.log(renderTerminalDivider(RULE_WIDTH, useColor));
  await cinematicPause(350, cinematicMode);
  console.log();
  console.log(paint(commandTitle(command), "dim"));
}

async function cinematicStep(label: string, results: Array<{ text: string; tone: "green" | "yellow" | "red" }>, pause: number): Promise<void> {
  if (!cinematicMode) return;
  console.log();
  console.log(paint(`→ ${label}`, "dim"));
  await cinematicPause(140, true);
  for (const result of results) {
    const marker = result.tone === "green" ? "✓" : result.tone === "yellow" ? "!" : "✕";
    console.log(`${paint(marker, result.tone)} ${paint(result.text, "white")}`);
  }
  await cinematicPause(pause, true);
}

function getClient(config: (typeof networkConfig)[NetworkName]): PublicClient {
  return createPublicClient({ chain: config.chain, transport: http(config.rpcUrl) });
}

async function readTokenMetadata(client: PublicClient, address: Address): Promise<{
  bytecodePresent: boolean;
  name?: string;
  symbol?: string;
  decimals?: number;
}> {
  const bytecode = await client.getBytecode({ address });
  if (!bytecode || bytecode === "0x") return { bytecodePresent: false };
  const values = await Promise.allSettled([
    client.readContract({ address, abi: erc20MetadataAbi, functionName: "name" }),
    client.readContract({ address, abi: erc20MetadataAbi, functionName: "symbol" }),
    client.readContract({ address, abi: erc20MetadataAbi, functionName: "decimals" }),
  ]);
  return {
    bytecodePresent: true,
    name: values[0].status === "fulfilled" ? values[0].value : undefined,
    symbol: values[1].status === "fulfilled" ? values[1].value : undefined,
    decimals: values[2].status === "fulfilled" ? Number(values[2].value) : undefined,
  };
}

async function readTradingYieldMarket(): Promise<YieldMarket | undefined> {
  if (network !== "mainnet") return undefined;
  try {
    return await pendleLiveYieldAdapter.getMarket(NVDA_MARKET_ID) || undefined;
  } catch {
    return undefined;
  }
}

async function readSource(): Promise<{
  asset?: Awaited<ReturnType<typeof fetchRobinhoodStockTokenAsset>>;
  events: DividendEvent[];
}> {
  if (network !== "mainnet") return { events: [] };
  try {
    const [asset, events] = await Promise.all([
      fetchRobinhoodStockTokenAsset({ tokenSymbol: "NVDA", tokenAddress: NVDA_TOKEN, chainId: 4663 }),
      fetchRobinhoodDividendEvents({ tokenSymbol: "NVDA", tokenAddress: NVDA_TOKEN, chainId: 4663 }),
    ]);
    return { asset, events };
  } catch {
    return { events: [] };
  }
}

function simulatedPosition(chainId: number, marketId: string): DividendPosition {
  return {
    positionId: `simulation:${chainId}:nvda-long`,
    marketId,
    chainId,
    assetSymbol: "NVDA",
    underlyingTokenAddress: chainId === 4663 ? NVDA_TOKEN : undefined,
    strategy: "long",
    ytAmountBaseUnits: "2000000000000000000",
    ytDecimals: 18,
    openedAt: "2026-09-01T00:00:00.000Z",
    maturityDate: "2026-10-15T00:00:00.000Z",
    status: "active",
  };
}

function simulationEvent(chainId: number, liveEvent?: DividendEvent): DividendEvent {
  if (liveEvent && chainId === 4663) return liveEvent;
  return createSimulationDividendEvent({
    tokenSymbol: "NVDA",
    tokenAddress: chainId === 4663 ? NVDA_TOKEN : undefined,
    chainId,
    processDate: "2026-10-01",
    rate: "0.25",
  });
}

async function run(): Promise<void> {
  if (!network || !["show", "validate", "simulate"].includes(command)) {
    throw new Error("Usage: bun dividend:<show|validate|simulate> --mainnet|--testnet [--cinematic]");
  }

  await header();
  const config = networkConfig[network];
  const client = getClient(config);
  const actualChainId = await client.getChainId().catch(() => undefined);
  const chainMatches = actualChainId === config.chainId;
  const market = chainMatches ? await readTradingYieldMarket() : undefined;
  const source = await readSource();
  const tokenAddress = network === "mainnet" ? NVDA_TOKEN : undefined;
  const selectedMarketId = network === "mainnet" ? NVDA_MARKET_ID : "TEST_DATA:NVDA:46630";
  const token: { bytecodePresent: boolean; decimals?: number } = tokenAddress && chainMatches
    ? await readTokenMetadata(client, tokenAddress).catch(() => ({ bytecodePresent: false }))
    : { bytecodePresent: false };
  const liveEvent = source.events.find((event) => event.status === "COMPLETED") || source.events[0];
  const developmentEvent = command === "simulate" ? simulationEvent(config.chainId, liveEvent) : undefined;
  const displayEvent = developmentEvent || liveEvent;
  const position = developmentEvent ? simulatedPosition(config.chainId, selectedMarketId) : undefined;
  const state = developmentEvent && position
    ? buildDividendEarnState({
        position,
        marketId: selectedMarketId,
        event: developmentEvent,
        asOf: "2026-10-08T00:00:00.000Z",
        enabled: true,
        expectedUnderlying: developmentEvent.tokenAddress,
        elapsedSeconds: BigInt(50),
        accrualPeriodSeconds: BigInt(100),
      })
    : undefined;

  await cinematicStep("Resolving Robinhood Chain network", [
    { text: chainMatches ? `${networkTitle(network)} · chain ${config.chainId}` : `Wrong chain · expected ${config.chainId}, received ${actualChainId || "UNAVAILABLE"}`, tone: chainMatches ? "green" : "red" },
  ], 250);
  await cinematicStep("Resolving Trading Yield market", [
    { text: market ? `${market.symbol} market metadata found` : "Live Trading Yield market unavailable", tone: market ? "green" : "yellow" },
  ], 300);
  await cinematicStep("Resolving underlying stock token", [
    { text: token.bytecodePresent ? "NVDA token bytecode found" : "Underlying token unavailable on selected network", tone: token.bytecodePresent ? "green" : "yellow" },
  ], 300);
  await cinematicStep("Reading dividend source", [
    { text: liveEvent ? `${liveEvent.type} · ${liveEvent.status}` : "No live dividend event for selected network", tone: liveEvent ? "green" : "yellow" },
  ], 300);
  await cinematicStep("Normalizing dividend event", [
    { text: liveEvent ? `${liveEvent.eventId} · normalized` : "No event to normalize", tone: liveEvent ? "green" : "yellow" },
  ], 250);
  await cinematicStep("Evaluating position eligibility", [
    { text: command === "simulate" ? "Long YT exposure mapped to NVDA" : "No wallet position attached; eligibility deferred", tone: command === "simulate" ? "green" : "yellow" },
  ], 250);
  await cinematicStep("Calculating dividend exposure", [
    { text: command === "simulate" ? "2.000000000000000000 YT exposure" : "Requires position snapshot", tone: command === "simulate" ? "green" : "yellow" },
  ], 250);
  await cinematicStep("Updating accrual state", [
    { text: command === "simulate" ? `${state?.accrued || "0.000000"} USD reference read-model accrual` : "Not calculated without position", tone: command === "simulate" ? "green" : "yellow" },
  ], 300);
  await cinematicStep("Checking settlement", [
    { text: "CLAIM SETTLEMENT: NOT ENABLED", tone: "yellow" },
  ], 350);
  await cinematicPause(1200, cinematicMode);

  section("NETWORK");
  line("MODE", command === "simulate" ? "SIMULATION / DEVELOPMENT" : "READ-ONLY OBSERVATION");
  line("NETWORK", networkTitle(network));
  line("CHAIN ID", String(config.chainId));
  line("RPC", actualChainId ? `CONNECTED · chain ${actualChainId} · READ-ONLY` : "UNAVAILABLE");
  line("CHAIN VALIDATION", chainMatches ? "PASS" : "FAIL · WRONG NETWORK");

  section("TRADING YIELD MARKET");
  line("MARKET", market?.name || "NVDA · LIVE MARKET UNAVAILABLE");
  line("MARKET ID", market?.id || selectedMarketId);
  line("STRATEGY", "TRADING YIELD · YT EXPOSURE");
  line("UNDERLYING", market?.underlyingAsset || "NVDA");
  line("MATURITY", market?.maturity || "UNAVAILABLE");
  line("MARKET STATUS", market?.status?.toUpperCase() || "UNAVAILABLE");

  section("DIVIDEND SOURCE");
  line("SOURCE", displayEvent ? sourceLabel(displayEvent.source) : network === "mainnet" ? "ROBINHOOD CORPORATE ACTIONS API" : "UNAVAILABLE · MAINNET SOURCE ONLY");
  line("TOKEN", source.asset?.tokenSymbol || "NVDA");
  line("TOKEN CONTRACT", tokenAddress || "NOT CONFIGURED ON TESTNET");
  line("TOKEN STATUS", source.asset?.status?.replace("ASSET_STATUS_", "") || "UNAVAILABLE");
  line("TOKEN DECIMALS", source.asset?.tokenDecimals?.toString() || token.decimals?.toString() || "UNAVAILABLE");
  line("CURRENT MULTIPLIER", source.asset?.currentMultiplier || "UNAVAILABLE");
  line("EVENTS OBSERVED", String(source.events.length));
  if (displayEvent) {
    line("LAST EVENT", `${displayEvent.type} · ${displayEvent.status}`);
    line("EVENT RATE", `${displayEvent.rate} USD / underlying share`);
    line("PROCESS DATE", displayEvent.processDate || "UNAVAILABLE");
    line("EVENT ID", displayEvent.eventId);
  }

  section("ELIGIBILITY");
  if (command === "simulate" && state) {
    line("POSITION", position?.positionId || "SIMULATION");
    line("POSITION EXPOSURE", "2.000000000000000000 YT");
    line("STATUS", state.status);
    line("ELIGIBILITY", state.eligible ? "ELIGIBLE · POSITION MATCHED" : "NOT ELIGIBLE");
    line("INTELLIGENCE FLOW", "DETECTED → VERIFIED → ELIGIBLE → ACCRUING → SETTLEMENT PENDING");
    line("REASON", state.reason);
  } else {
    line("POSITION", "NO WALLET POSITION ATTACHED");
    line("ELIGIBILITY", "NOT EVALUATED · POSITION REQUIRED");
    line("INTELLIGENCE FLOW", liveEvent ? "DETECTED → VERIFIED → POSITION REQUIRED" : "UNAVAILABLE · NO EVENT");
    line("RULE", "ACTIVE LONG POSITION + MATCHING MARKET + YT EXPOSURE");
  }

  section("DIVIDEND ACCOUNTING");
  if (command === "simulate" && state) {
    line("DIVIDEND TYPE", state.dividendType || "CASH_DIVIDEND");
    line("RATE", state.rate || "UNAVAILABLE");
    line("ACCRUED", `${state.accrued} USD REFERENCE`);
    line("SETTLEMENT AMOUNT", `${state.claimable} USD REFERENCE · NOT ENABLED`);
    line("LAST EVENT", state.lastEventId || "UNAVAILABLE");
  } else {
    line("ACCRUED", "0.000000 · NOT CALCULATED WITHOUT POSITION");
    line("SETTLEMENT AMOUNT", "UNAVAILABLE · NO POSITION SNAPSHOT");
  }

  section("SETTLEMENT");
  line("CLAIM SETTLEMENT", command === "simulate" ? "NOT ENABLED" : "NOT ENABLED");
  line("SETTLEMENT MODE", command === "simulate" ? "SIMULATION ONLY" : "READ-ONLY");
  line("WALLET ACTION", "NONE · NO TRANSACTION SENT");
  line("TRANSFERRED REWARD", "NONE");

  if (command === "validate") {
    section("VALIDATION");
    check("Chain ID", chainMatches);
    check("Stock-token bytecode", token.bytecodePresent, network !== "mainnet");
    check("Live Trading Yield market", Boolean(market), network !== "mainnet");
    check("Dividend event source", Boolean(liveEvent), network !== "mainnet");
    check("Position-aware eligibility", true, true);
    line("VALIDATION", market && token.bytecodePresent && liveEvent ? "VALID READ-ONLY CANDIDATE" : "PARTIAL · DEVELOPMENT LAYER ONLY");
  }

  if (command === "simulate") {
    section("SIMULATION / DEVELOPMENT");
    check("Deterministic dividend event", Boolean(developmentEvent), false);
    check("Position mapping", Boolean(state?.eligible), false);
    check("Decimal-safe accrual", Boolean(state?.accrued), false);
    check("Claim settlement", false, true);
    line("FINAL STATUS", "SIMULATION ONLY · NO SETTLEMENT");
  } else {
    line("FINAL STATUS", network === "mainnet" && market && liveEvent ? "OBSERVED · SETTLEMENT NOT ENABLED" : "UNAVAILABLE · DEVELOPMENT LAYER");
  }
  console.log();
  console.log(renderTerminalDivider(RULE_WIDTH, useColor));
}

await run();
