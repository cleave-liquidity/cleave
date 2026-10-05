import {
  createPublicClient,
  erc20Abi,
  formatEther,
  formatUnits,
  http,
  isAddress,
  isHex,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { getConfiguredChainId } from "@/lib/web3/environment";
import {
  robinhoodChain,
  robinhoodChainTestnet,
  ROBINHOOD_CHAIN_ID,
} from "@/lib/web3/chains";
import { verifiedTokenMetadata } from "@/lib/metadata/tokens";
import { displayAmountToBaseUnits } from "@/lib/utils/amounts";
import { getContractByName } from "@/lib/contracts/deployments";
import {
  readCleaveLifecycle,
  readCleaveMarketSummary,
  validateCleaveExecution,
} from "@/lib/contracts/cleave-runtime";
import { normalizeYieldError, YieldDomainError } from "@/types/errors";
import type { HistoricalYieldPoint, MarketTokenMetadata, YieldMarket } from "@/types/market";
import type { ExitQuote, FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import type { FixedYieldPosition, LongYieldPosition, YieldPosition } from "@/types/position";
import type { TokenApprovalRequest, TransactionHash, TransactionReceiptResult } from "@/types/transaction";
import type { TokenMetadata } from "@/types/token";
import type { PositionTransactionResult, YieldAdapterRuntime, YieldMarketAdapter } from "./types";

const PENDLE_API_BASE = "https://api-v2.pendle.finance/core";
const QUOTE_RECEIVER = "0x1111111111111111111111111111111111111111" as Address;
const DEFAULT_SLIPPAGE = 0.01;
const DAY_MS = 86_400_000;

type RawMarket = {
  name?: unknown;
  protocol?: unknown;
  icon?: unknown;
  address?: unknown;
  expiry?: unknown;
  pt?: unknown;
  yt?: unknown;
  sy?: unknown;
  underlyingAsset?: unknown;
  details?: {
    liquidity?: unknown;
    underlyingApy?: unknown;
    impliedApy?: unknown;
  } | null;
  marketInfo?: {
    assetDescription?: unknown;
    utilizedProtocols?: Array<{ name?: unknown; imageUrl?: unknown }>;
  };
  chainId?: unknown;
};

type MarketListResponse = { results?: RawMarket[]; total?: number };
type AssetResponse = {
  assets?: Array<{
    address?: unknown;
    chainId?: unknown;
    decimals?: unknown;
    symbol?: unknown;
    name?: unknown;
    proIcon?: unknown;
  }>;
};

type HistoricalResponse = {
  results?: Array<{
    timestamp?: unknown;
    underlyingApy?: unknown;
    impliedApy?: unknown;
  }>;
};

type PendleAssetMetadata = {
  decimals: number;
  symbol: string;
  name: string;
  iconUrl?: string;
};

export function normalizePendleHistoricalData(
  results: HistoricalResponse["results"] = [],
): HistoricalYieldPoint[] {
  return (results || [])
    .map((point): HistoricalYieldPoint | undefined => {
      const timestamp = asString(point?.timestamp);
      const underlyingApy = asFiniteNumber(point?.underlyingApy);
      const impliedApy = asFiniteNumber(point?.impliedApy);
      if (!timestamp || underlyingApy === undefined || impliedApy === undefined) return undefined;
      return { timestamp, underlyingApy: underlyingApy * 100, impliedApy: impliedApy * 100 };
    })
    .filter((point): point is HistoricalYieldPoint => Boolean(point));
}

type ConvertResponse = {
  action?: unknown;
  requiredApprovals?: Array<{ token?: unknown; amount?: unknown }>;
  routes?: Array<{
    tx?: { data?: unknown; to?: unknown; from?: unknown; value?: unknown };
    outputs?: Array<{ token?: unknown; amount?: unknown }>;
    data?: {
      priceImpact?: unknown;
      impliedApy?: { before?: unknown; after?: unknown };
      gasUsed?: unknown;
    };
  }>;
};

type SdkTransactionResponse = {
  tx?: { data?: unknown; to?: unknown; from?: unknown; value?: unknown };
  tokenApprovals?: Array<{ token?: unknown; amount?: unknown }>;
};

type ClaimTokenAmount = { token?: unknown; amount?: unknown };
type ApiPosition = {
  balance?: unknown;
  valuation?: unknown;
  claimTokenAmounts?: ClaimTokenAmount[];
};
type ApiMarketPosition = {
  marketId?: unknown;
  pt?: ApiPosition;
  yt?: ApiPosition;
};
type ApiChainPositions = {
  chainId?: unknown;
  openPositions?: ApiMarketPosition[];
  closedPositions?: ApiMarketPosition[];
};
type PositionsResponse = { positions?: ApiChainPositions[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function lower(value: string): string {
  return value.toLowerCase();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toAddress(value: unknown): Address | undefined {
  return typeof value === "string" && isAddress(value) ? value : undefined;
}

function toHex(value: unknown): Hex | undefined {
  return typeof value === "string" && isHex(value) ? value : undefined;
}

function transactionValue(value: unknown): string | undefined {
  // Pendle may omit `tx.value`; reviewed exit quotes store the normalized value as bigint.
  if (value === undefined) return "0";
  if (typeof value === "bigint") return value >= BigInt(0) ? value.toString() : undefined;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : undefined;
  }
  return asString(value);
}

export type NormalizedPendleTransaction = {
  to: Address;
  data: Hex;
  value: bigint;
  from?: Address;
};

export function normalizePendleTransaction(
  transaction: { data?: unknown; to?: unknown; from?: unknown; value?: unknown } | undefined,
  label = "transaction",
): NormalizedPendleTransaction {
  const to = toAddress(transaction?.to);
  const data = toHex(transaction?.data);
  const from = transaction?.from === undefined ? undefined : toAddress(transaction.from);
  const rawValue = transactionValue(transaction?.value);

  if (
    !to ||
    !data ||
    data.length <= 2 ||
    (data.length - 2) % 2 !== 0 ||
    (transaction?.from !== undefined && !from) ||
    !rawValue ||
    !/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(rawValue)
  ) {
    throw new YieldDomainError("live-source-unavailable", `Pendle returned invalid ${label} calldata.`);
  }

  try {
    return { to, data, value: BigInt(rawValue), from };
  } catch {
    throw new YieldDomainError("live-source-unavailable", `Pendle returned invalid ${label} value.`);
  }
}

function assetAddress(value: unknown, chainId: number): Address | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  const prefix = `${chainId}-`;
  return toAddress(raw.startsWith(prefix) ? raw.slice(prefix.length) : raw);
}

function assetId(address: Address, chainId: number): string {
  return `${chainId}-${address.toLowerCase()}`;
}

function formatMaturity(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function statusForExpiry(expiry: Date): YieldMarket["status"] {
  const days = Math.ceil((expiry.getTime() - Date.now()) / DAY_MS);
  if (days <= 0) return "matured";
  return days <= 30 ? "maturing" : "active";
}

function parseRawAmount(value: unknown, label: string): bigint {
  const raw = asString(value);
  if (!raw || !/^\d+$/.test(raw)) {
    throw new YieldDomainError("live-source-unavailable", `Pendle returned an invalid ${label} amount.`);
  }
  return BigInt(raw);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "The live Pendle source could not be reached.";
}

export function normalizePendleMarket(
  raw: RawMarket,
  chainId: 4663,
  underlying: TokenMetadata,
  pendleAssets: Map<string, PendleAssetMetadata>,
): YieldMarket | null {
  const address = toAddress(raw.address);
  const ptAddress = assetAddress(raw.pt, chainId);
  const ytAddress = assetAddress(raw.yt, chainId);
  const syAddress = assetAddress(raw.sy, chainId);
  const underlyingAddress = assetAddress(raw.underlyingAsset, chainId);
  const expiryRaw = asString(raw.expiry);
  const expiry = expiryRaw ? new Date(expiryRaw) : undefined;
  const details = raw.details;
  const liquidityUsd = asFiniteNumber(details?.liquidity);
  const underlyingApy = asFiniteNumber(details?.underlyingApy);
  const impliedApy = asFiniteNumber(details?.impliedApy);
  if (
    !address ||
    !ptAddress ||
    !ytAddress ||
    !syAddress ||
    !underlyingAddress ||
    !expiry ||
    !Number.isFinite(expiry.getTime()) ||
    liquidityUsd === undefined ||
    underlyingApy === undefined ||
    impliedApy === undefined
  ) {
    return null;
  }

  const ptMeta = pendleAssets.get(lower(ptAddress));
  const ytMeta = pendleAssets.get(lower(ytAddress));
  const syMeta = pendleAssets.get(lower(syAddress));
  if (!ptMeta || !ytMeta) return null;

  const sourceProtocol = "Pendle";
  const utilizedProtocol = raw.marketInfo?.utilizedProtocols?.[0];
  const yieldSource = asString(utilizedProtocol?.name) || asString(raw.protocol) || sourceProtocol;
  const description = asString(raw.marketInfo?.assetDescription);
  const name = asString(raw.name) || underlying.name;
  const tokenMetadata = (address: Address, metadata?: PendleAssetMetadata): MarketTokenMetadata | undefined =>
    metadata
      ? {
          address,
          symbol: metadata.symbol,
          name: metadata.name,
          decimals: metadata.decimals,
          iconUrl: metadata.iconUrl,
        }
      : undefined;

  return {
    id: lower(address),
    symbol: underlying.symbol,
    name,
    description: description ? stripHtml(description) : `${name} Pendle yield market on Robinhood Chain.`,
    underlyingAsset: underlying.symbol,
    quoteAsset: underlying.symbol,
    yieldSource,
    sourceProtocol,
    assetMetadata: {
      symbol: underlying.symbol,
      name: underlying.name,
      iconUrl: asString(raw.icon),
    },
    protocolMetadata: { name: "Pendle" },
    yieldSourceMetadata: { name: yieldSource, iconUrl: asString(utilizedProtocol?.imageUrl) },
    syMetadata: tokenMetadata(syAddress, syMeta),
    ptMetadata: tokenMetadata(ptAddress, ptMeta),
    ytMetadata: tokenMetadata(ytAddress, ytMeta),
    underlyingApy: underlyingApy * 100,
    impliedApy: impliedApy * 100,
    maturity: formatMaturity(expiry),
    maturityDate: expiry.toISOString().slice(0, 10),
    daysRemaining: Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / DAY_MS)),
    liquidityUsd,
    status: statusForExpiry(expiry),
    network: "mainnet",
    chainId,
    dataMode: "live",
    marketAddress: address,
    syAddress,
    ptAddress,
    ytAddress,
    underlyingTokenAddress: underlyingAddress,
    underlyingDecimals: underlying.decimals,
    ptDecimals: ptMeta.decimals,
    ytDecimals: ytMeta.decimals,
  };
}

export class PendleLiveYieldMarketAdapter implements YieldMarketAdapter {
  readonly mode = "live" as const;
  private readonly marketsCache = new Map<number, { expiresAt: number; markets: YieldMarket[] }>();
  private readonly historicalCache = new Map<string, { expiresAt: number; history?: HistoricalYieldPoint[] }>();

  private getChainId(chainId?: number): 4663 {
    const selected = chainId ?? getConfiguredChainId();
    if (selected !== ROBINHOOD_CHAIN_ID) {
      throw new YieldDomainError(
        "live-source-unavailable",
        "Pendle live markets are currently verified on Robinhood Chain Mainnet (4663) only.",
      );
    }
    return ROBINHOOD_CHAIN_ID;
  }

  private getRpcUrl(chainId: number): string {
    const value = chainId === ROBINHOOD_CHAIN_ID
      ? process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL
      : process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL;
    if (!value?.trim()) {
      throw new YieldDomainError(
        "live-source-unavailable",
        "A Robinhood Chain RPC URL is required for live integration.",
      );
    }
    return value.trim();
  }

  private createPublicClient(chainId: number): PublicClient {
    const chain = chainId === ROBINHOOD_CHAIN_ID ? robinhoodChain : robinhoodChainTestnet;
    return createPublicClient({ chain, transport: http(this.getRpcUrl(chainId)) });
  }

  private resolvePublicClient(chainId: number, runtime?: YieldAdapterRuntime): PublicClient {
    if (runtime?.publicClient) {
      if (runtime.publicClient.chain?.id && runtime.publicClient.chain.id !== chainId) {
        throw new YieldDomainError("wrong-network", "The RPC client is connected to a different network.");
      }
      return runtime.publicClient;
    }
    return this.createPublicClient(chainId);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${PENDLE_API_BASE}${path}`, {
        ...init,
        cache: "no-store",
        headers: { accept: "application/json", ...(init?.headers || {}) },
      });
      const payload: unknown = await response.json().catch(() => undefined);
      if (!response.ok) {
        const message = isRecord(payload) && typeof payload.message === "string"
          ? payload.message
          : `Pendle API returned HTTP ${response.status}.`;
        throw new YieldDomainError("live-source-unavailable", message);
      }
      return payload as T;
    } catch (error) {
      if (error instanceof YieldDomainError) throw error;
      throw new YieldDomainError("live-source-unavailable", getErrorMessage(error));
    }
  }

  private async fetchRawMarkets(chainId: 4663): Promise<RawMarket[]> {
    const limit = 100;
    const results: RawMarket[] = [];
    let skip = 0;
    let total = Number.POSITIVE_INFINITY;
    while (skip < total) {
      const response = await this.request<MarketListResponse>(
        `/v2/markets/all?chainId=${chainId}&limit=${limit}&skip=${skip}`,
      );
      const page = Array.isArray(response.results) ? response.results : [];
      results.push(...page);
      total = asFiniteNumber(response.total) ?? results.length;
      if (page.length === 0 || page.length < limit) break;
      skip += page.length;
    }
    if (results.length === 0) {
      throw new YieldDomainError("live-source-unavailable", "Pendle returned no verified markets for Robinhood Chain.");
    }
    return results.filter((market) => market.chainId === undefined || Number(market.chainId) === chainId);
  }

  private async fetchPendleAssetMetadata(
    markets: RawMarket[],
    chainId: 4663,
  ): Promise<Map<string, PendleAssetMetadata>> {
    const ids = markets.flatMap((market) => [market.pt, market.yt, market.sy])
      .map((value) => {
        const address = assetAddress(value, chainId);
        return address ? assetId(address, chainId) : undefined;
      })
      .filter((value): value is string => Boolean(value));
    const uniqueIds = [...new Set(ids)];
    const assets = new Map<string, PendleAssetMetadata>();
    for (let index = 0; index < uniqueIds.length; index += 20) {
      const chunk = uniqueIds.slice(index, index + 20).join(",");
      const response = await this.request<AssetResponse>(`/v1/assets/all?ids=${encodeURIComponent(chunk)}`);
      for (const asset of response.assets || []) {
        const address = toAddress(asset.address);
        const assetChainId = asFiniteNumber(asset.chainId);
        const decimals = asFiniteNumber(asset.decimals);
        const symbol = asString(asset.symbol);
        const name = asString(asset.name);
        if (
          address &&
          (assetChainId === undefined || assetChainId === chainId) &&
          decimals !== undefined &&
          symbol &&
          name &&
          Number.isInteger(decimals)
        ) {
          assets.set(lower(address), { decimals, symbol, name, iconUrl: asString(asset.proIcon) });
        }
      }
    }
    return assets;
  }

  private async readUnderlyingMetadata(
    address: Address,
    chainId: 4663,
    runtime?: YieldAdapterRuntime,
    fallback?: { symbol?: string; name?: string },
  ): Promise<TokenMetadata> {
    const known = verifiedTokenMetadata[chainId].find((token) => lower(token.address) === lower(address));
    if (known) return known;

    const client = this.resolvePublicClient(chainId, runtime);
    try {
      const decimals = await client.readContract({ address, abi: erc20Abi, functionName: "decimals" });
      if (!Number.isInteger(Number(decimals))) {
        throw new YieldDomainError("invalid-token-metadata", "The live token returned invalid metadata.");
      }
      const [symbolResult, nameResult] = await Promise.allSettled([
        client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
        client.readContract({ address, abi: erc20Abi, functionName: "name" }),
      ]);
      const symbol = symbolResult.status === "fulfilled" && symbolResult.value
        ? symbolResult.value
        : fallback?.symbol;
      const name = nameResult.status === "fulfilled" && nameResult.value
        ? nameResult.value
        : fallback?.name;
      if (!symbol || !name) {
        throw new YieldDomainError("invalid-token-metadata", "The live token returned no verified display metadata.");
      }
      return { address, symbol, name, decimals: Number(decimals), chainId };
    } catch (error) {
      if (error instanceof YieldDomainError) throw error;
      throw new YieldDomainError("live-source-unavailable", `Unable to verify token metadata for ${address}.`);
    }
  }

  private async normalizeMarkets(rawMarkets: RawMarket[], chainId: 4663, runtime?: YieldAdapterRuntime): Promise<YieldMarket[]> {
    const pendleAssets = await this.fetchPendleAssetMetadata(rawMarkets, chainId);
    const normalized = await Promise.all(rawMarkets.map(async (raw) => {
      const underlyingAddress = assetAddress(raw.underlyingAsset, chainId);
      if (!underlyingAddress) return null;
      try {
        const underlying = await this.readUnderlyingMetadata(underlyingAddress, chainId, runtime);
        return normalizePendleMarket(raw, chainId, underlying, pendleAssets);
      } catch (error) {
        if (error instanceof YieldDomainError && error.code === "invalid-token-metadata") {
          return null;
        }
        throw error;
      }
    }));
    const marketsById = new Map<string, YieldMarket>();
    for (const market of normalized) {
      if (market) marketsById.set(market.id, market);
    }
    const markets = [...marketsById.values()];
    if (markets.length === 0) {
      throw new YieldDomainError(
        "live-source-unavailable",
        "Pendle returned markets, but none passed verified token and contract metadata checks.",
      );
    }
    return markets;
  }

  private async getLiveMarkets(runtime?: YieldAdapterRuntime): Promise<YieldMarket[]> {
    const chainId = this.getChainId();
    const cached = this.marketsCache.get(chainId);
    if (cached && cached.expiresAt > Date.now()) return cached.markets;
    const markets = await this.normalizeMarkets(await this.fetchRawMarkets(chainId), chainId, runtime);
    this.marketsCache.set(chainId, { markets, expiresAt: Date.now() + 60_000 });
    return markets;
  }

  async getMarkets(): Promise<YieldMarket[]> {
    return this.getLiveMarkets();
  }

  async getMarket(id: string): Promise<YieldMarket | null> {
    const chainId = this.getChainId();
    const rawMarkets = await this.fetchRawMarkets(chainId);
    const alias = id.toLowerCase() === "usdg-morpho-26mar27"
      ? "0xc2b89e6eca583e2c232201ac557e9be58af55f4c"
      : id;
    const raw = rawMarkets.find((candidate) => lower(String(candidate.address || "")) === lower(alias));
    if (!raw) return null;
    const markets = await this.normalizeMarkets([raw], chainId);
    const market = markets[0];
    if (!market) return null;
    return { ...market, historicalData: await this.getHistoricalData(market.id) };
  }

  private async getHistoricalData(marketAddress: string): Promise<HistoricalYieldPoint[] | undefined> {
    const cached = this.historicalCache.get(marketAddress);
    if (cached && cached.expiresAt > Date.now()) return cached.history;

    try {
      const response = await this.request<HistoricalResponse>(
        `/v3/${ROBINHOOD_CHAIN_ID}/markets/${marketAddress}/historical-data`,
      );
      const history = normalizePendleHistoricalData(response.results);
      const value = history.length > 0 ? history : undefined;
      this.historicalCache.set(marketAddress, { history: value, expiresAt: Date.now() + 60_000 });
      return value;
    } catch {
      this.historicalCache.set(marketAddress, { history: undefined, expiresAt: Date.now() + 60_000 });
      return undefined;
    }
  }

  private async getMarketOrThrow(id: string, runtime?: YieldAdapterRuntime): Promise<YieldMarket> {
    const markets = await this.getLiveMarkets(runtime);
    const alias = id.toLowerCase() === "usdg-morpho-26mar27"
      ? "0xc2b89e6eca583e2c232201ac557e9be58af55f4c"
      : id;
    const market = markets.find((candidate) => candidate.id === alias.toLowerCase());
    if (!market) throw new YieldDomainError("market-not-found", "The selected live market was not found.");
    return market;
  }

  private async feeEstimate(route: NonNullable<ConvertResponse["routes"]>[number], runtime?: YieldAdapterRuntime): Promise<number | undefined> {
    const gasUsed = asString(route.data?.gasUsed);
    if (!gasUsed) return undefined;
    try {
      const client = this.resolvePublicClient(ROBINHOOD_CHAIN_ID, runtime);
      const gasPrice = await client.getGasPrice();
      return Number(formatEther(BigInt(gasUsed) * gasPrice));
    } catch {
      return undefined;
    }
  }

  private async convert(
    chainId: 4663,
    receiver: Address,
    inputToken: Address,
    inputAmount: bigint,
    outputTokens: Address[],
  ): Promise<ConvertResponse> {
    return this.request<ConvertResponse>(`/v3/sdk/${chainId}/convert`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        receiver,
        slippage: DEFAULT_SLIPPAGE,
        inputs: [{ token: inputToken, amount: inputAmount.toString() }],
        outputs: outputTokens,
        additionalData: "impliedApy",
      }),
    });
  }

  private getRoute(response: ConvertResponse): NonNullable<ConvertResponse["routes"]>[number] {
    const route = response.routes?.[0];
    if (!route?.tx || !Array.isArray(route.outputs)) {
      throw new YieldDomainError("live-source-unavailable", "Pendle returned no executable route for this quote.");
    }
    return route;
  }

  async getFixedQuote(marketId: string, inputAmount: number, runtime?: YieldAdapterRuntime): Promise<FixedYieldQuote> {
    try {
      const market = await this.getMarketOrThrow(marketId, runtime);
      if (market.status === "matured") throw new YieldDomainError("market-expired", "This live market has reached maturity.");
      if (!market.underlyingTokenAddress || !market.ptAddress || market.underlyingDecimals === undefined || market.ptDecimals === undefined) {
        throw new YieldDomainError("live-source-unavailable", "This live market is missing verified token metadata.");
      }
      await validateCleaveExecution(market.id, this.resolvePublicClient(ROBINHOOD_CHAIN_ID, runtime));
      const inputBaseUnits = displayAmountToBaseUnits(inputAmount, market.underlyingDecimals);
      const response = await this.convert(ROBINHOOD_CHAIN_ID, QUOTE_RECEIVER, market.underlyingTokenAddress, inputBaseUnits, [market.ptAddress]);
      const route = this.getRoute(response);
      const output = route.outputs?.find((item) => lower(String(item.token || "")) === lower(market.ptAddress!));
      const ptRaw = parseRawAmount(output?.amount, "PT output");
      const ptReceived = Number(formatUnits(ptRaw, market.ptDecimals));
      const ptPrice = ptReceived > 0 ? inputAmount / ptReceived : 0;
      const daysToMaturity = market.daysRemaining;
      const quotedFixedApy = ptPrice > 0 && daysToMaturity > 0
        ? (Math.pow(1 / ptPrice, 365 / daysToMaturity) - 1) * 100
        : 0;
      const impliedApy = asFiniteNumber(route.data?.impliedApy?.after);
      return {
        quoteId: `pendle:${market.id}:${Date.now()}`,
        marketId: market.id,
        inputAmount,
        ptReceived,
        impliedApy: (impliedApy ?? market.impliedApy / 100) * 100,
        quotedFixedApy,
        priceImpact: Math.abs(asFiniteNumber(route.data?.priceImpact) || 0) * 100,
        networkFeeEstimate: await this.feeEstimate(route, runtime),
        estimatedMaturityValue: ptReceived,
        ptPrice,
        daysToMaturity,
        quoteTimestamp: Date.now(),
        quoteExpiry: Date.now() + 15_000,
        source: `${PENDLE_API_BASE}/v3/sdk/${ROBINHOOD_CHAIN_ID}/convert`,
        inputBaseUnits,
        outputBaseUnits: ptRaw,
        approvalToken: market.underlyingTokenAddress,
        approvalAmount: inputBaseUnits,
      };
    } catch (error) {
      throw error instanceof YieldDomainError ? error : normalizeYieldError(error);
    }
  }

  async getLongQuote(marketId: string, inputAmount: number, runtime?: YieldAdapterRuntime): Promise<LongYieldQuote> {
    const market = await this.getMarketOrThrow(marketId, runtime);
    if (market.status === "matured") throw new YieldDomainError("market-expired", "This live market has reached maturity.");
    if (!market.underlyingTokenAddress || !market.ytAddress || market.underlyingDecimals === undefined || market.ytDecimals === undefined) {
      throw new YieldDomainError("live-source-unavailable", "This live market is missing verified token metadata.");
    }
    await validateCleaveExecution(market.id, this.resolvePublicClient(ROBINHOOD_CHAIN_ID, runtime));
    const inputBaseUnits = displayAmountToBaseUnits(inputAmount, market.underlyingDecimals);
    const response = await this.convert(ROBINHOOD_CHAIN_ID, QUOTE_RECEIVER, market.underlyingTokenAddress, inputBaseUnits, [market.ytAddress]);
    const route = this.getRoute(response);
    const output = route.outputs?.find((item) => lower(String(item.token || "")) === lower(market.ytAddress!));
    const ytRaw = parseRawAmount(output?.amount, "YT output");
    const ytReceived = Number(formatUnits(ytRaw, market.ytDecimals));
    const impliedApy = (asFiniteNumber(route.data?.impliedApy?.after) ?? market.impliedApy / 100) * 100;
    const underlyingApy = market.underlyingApy;
    const fee = await this.feeEstimate(route, runtime);
    return {
      quoteId: `pendle:${market.id}:${Date.now()}`,
      marketId: market.id,
      inputAmount,
      ytReceived,
      underlyingApy,
      impliedApy,
      estimatedBreakEvenApy: impliedApy,
      priceImpact: Math.abs(asFiniteNumber(route.data?.priceImpact) || 0) * 100,
      networkFeeEstimate: fee,
      estimatedYieldExposure: ytReceived,
      ytPrice: ytReceived > 0 ? inputAmount / ytReceived : 0,
      daysToMaturity: market.daysRemaining,
      quoteTimestamp: Date.now(),
      quoteExpiry: Date.now() + 15_000,
      source: `${PENDLE_API_BASE}/v3/sdk/${ROBINHOOD_CHAIN_ID}/convert`,
      inputBaseUnits,
      outputBaseUnits: ytRaw,
      approvalToken: market.underlyingTokenAddress,
      approvalAmount: inputBaseUnits,
    };
  }

  async getExitQuote(
    positionId: string,
    userAddress: Address,
    chainId?: number,
    runtime?: YieldAdapterRuntime,
  ): Promise<ExitQuote> {
    const parts = this.positionParts(positionId);
    if (parts.owner.toLowerCase() !== userAddress.toLowerCase()) {
      throw new YieldDomainError("position-owner-mismatch", "This live position belongs to another wallet.");
    }
    const selectedChain = this.getChainId(chainId);
    const market = await this.getMarketOrThrow(parts.marketId, runtime);
    if (market.status === "matured") {
      throw new YieldDomainError("position-not-sellable", "A matured live position must use its maturity action.");
    }

    const inputToken = parts.strategy === "fixed" ? market.ptAddress : market.ytAddress;
    const inputDecimals = parts.strategy === "fixed" ? market.ptDecimals : market.ytDecimals;
    const outputToken = market.underlyingTokenAddress;
    if (!inputToken || inputDecimals === undefined || !outputToken || market.underlyingDecimals === undefined) {
      throw new YieldDomainError("unsupported-operation", "This live market does not expose a verified sell route.");
    }

    const { publicClient } = this.assertWalletRuntime(selectedChain, runtime);
    const lifecycle = await readCleaveLifecycle(parts.marketId, parts.strategy, publicClient);
    if (!lifecycle.sellEarlyEligible) {
      throw new YieldDomainError("position-not-sellable", "CLEAVE reports that this position is not eligible for early sale.");
    }
    await validateCleaveExecution(parts.marketId, publicClient);
    const inputBaseUnits = await this.readTokenBalance(publicClient, inputToken, userAddress);
    if (inputBaseUnits <= BigInt(0)) {
      throw new YieldDomainError("position-not-sellable", "No live token balance is available to sell.");
    }

    const response = await this.convert(selectedChain, userAddress, inputToken, inputBaseUnits, [outputToken]);
    const route = this.getRoute(response);
    const transaction = normalizePendleTransaction(route.tx, "exit transaction");
    const verifiedRouter = getContractByName(selectedChain, "Pendle Router V2")?.address;
    if (!verifiedRouter || lower(transaction.to) !== lower(verifiedRouter)) {
      throw new YieldDomainError("live-source-unavailable", "Pendle returned an unverified exit router address.");
    }
    if (transaction.from && lower(transaction.from) !== lower(userAddress)) {
      throw new YieldDomainError("live-source-unavailable", "Pendle returned exit calldata for a different wallet.");
    }
    const output = route.outputs?.find((item) => lower(String(item.token || "")) === lower(outputToken));
    const outputBaseUnits = parseRawAmount(output?.amount, "exit output");
    const approval = response.requiredApprovals?.find((item) => lower(String(item.token || "")) === lower(inputToken));
    const approvalToken = approval ? toAddress(approval.token) : undefined;
    const approvalAmount = approval ? parseRawAmount(approval.amount, "exit approval") : undefined;
    const slippageBps = Math.round(DEFAULT_SLIPPAGE * 10_000);
    const minimumReceivedBaseUnits = outputBaseUnits * BigInt(10_000 - slippageBps) / BigInt(10_000);
    const quoteTimestamp = Date.now();

    return {
      quoteId: `pendle-exit:${positionId}:${quoteTimestamp}`,
      positionId,
      marketId: parts.marketId,
      chainId: selectedChain,
      inputToken,
      inputSymbol: parts.strategy === "fixed" ? "PT" : "YT",
      inputAmount: Number(formatUnits(inputBaseUnits, inputDecimals)),
      outputToken,
      outputSymbol: market.quoteAsset,
      outputAmount: Number(formatUnits(outputBaseUnits, market.underlyingDecimals)),
      minimumReceived: Number(formatUnits(minimumReceivedBaseUnits, market.underlyingDecimals)),
      priceImpact: Math.abs(asFiniteNumber(route.data?.priceImpact) || 0) * 100,
      networkFeeEstimate: await this.feeEstimate(route, runtime),
      maturity: market.maturity,
      quoteTimestamp,
      quoteExpiry: quoteTimestamp + 15_000,
      inputBaseUnits,
      outputBaseUnits,
      approvalToken,
      approvalAmount,
      spender: transaction.to,
      transaction,
      source: `${PENDLE_API_BASE}/v3/sdk/${selectedChain}/convert`,
    };
  }

  private assertWalletRuntime(chainId: number, runtime?: YieldAdapterRuntime): { publicClient: PublicClient; walletClient: WalletClient } {
    const publicClient = this.resolvePublicClient(chainId, runtime);
    const walletClient = runtime?.walletClient;
    if (!walletClient) throw new YieldDomainError("wallet-disconnected", "Connect a wallet to submit a live transaction.");
    if (walletClient.chain?.id && walletClient.chain.id !== chainId) {
      throw new YieldDomainError("wrong-network", "Switch your wallet to Robinhood Chain Mainnet.");
    }
    return { publicClient, walletClient };
  }

  private async assertNativeGasBalance(publicClient: PublicClient, owner: Address): Promise<void> {
    try {
      const balance = await publicClient.getBalance({ address: owner });
      if (balance <= BigInt(0)) {
        throw new YieldDomainError("insufficient-eth-for-gas", "Insufficient ETH for network fees.");
      }
    } catch (error) {
      throw error instanceof YieldDomainError ? error : normalizeYieldError(error);
    }
  }

  private async executeTransaction(
    response: ConvertResponse,
    owner: Address,
    chainId: 4663,
    expectedInputToken: Address,
    marketId: string,
    runtime?: YieldAdapterRuntime,
    options?: { allowApproval?: boolean },
  ): Promise<{ txHash: TransactionHash; blockNumber?: bigint; outputAmount?: bigint }> {
    const route = this.getRoute(response);
    const transaction = normalizePendleTransaction(route.tx, "transaction");
    const verifiedRouter = getContractByName(chainId, "Pendle Router V2")?.address;
    if (!verifiedRouter || lower(transaction.to) !== lower(verifiedRouter)) {
      throw new YieldDomainError("live-source-unavailable", "Pendle returned an unverified router address.");
    }
    if (transaction.from && lower(transaction.from) !== lower(owner)) {
      throw new YieldDomainError("live-source-unavailable", "Pendle returned calldata for a different wallet.");
    }
    const { publicClient, walletClient } = this.assertWalletRuntime(chainId, runtime);
    await this.assertNativeGasBalance(publicClient, owner);
    await validateCleaveExecution(marketId, publicClient);
    for (const approval of response.requiredApprovals || []) {
      const token = toAddress(approval.token);
      const amount = parseRawAmount(approval.amount, "approval");
      if (!token || amount <= BigInt(0)) throw new YieldDomainError("live-source-unavailable", "Pendle returned an invalid approval request.");
      if (lower(token) !== lower(expectedInputToken)) {
        throw new YieldDomainError("live-source-unavailable", "Pendle returned an approval for an unexpected token.");
      }
      const allowance = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, transaction.to],
      });
      if (allowance < amount) {
        if (options?.allowApproval === false) {
          throw new YieldDomainError("approval-required", "Approve the PT before selling this position.");
        }
        const approvalHash = await walletClient.writeContract({
          account: owner,
          address: token,
          abi: erc20Abi,
          functionName: "approve",
          args: [transaction.to, amount],
          chain: walletClient.chain,
        });
        const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        if (approvalReceipt.status !== "success") {
          throw new YieldDomainError("approval-rejected", "The token approval transaction was reverted.");
        }
        const refreshedAllowance = await publicClient.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [owner, transaction.to],
        });
        if (refreshedAllowance < amount) {
          throw new YieldDomainError("approval-rejected", "The confirmed approval did not update the required allowance.");
        }
      }
    }
    const hash = await walletClient.sendTransaction({
      account: owner,
      to: transaction.to,
      data: transaction.data,
      value: transaction.value,
      chain: walletClient.chain,
    });
    runtime?.onTransactionSubmitted?.(hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new YieldDomainError("transaction-reverted", "The live transaction was reverted by the network.");
    }
    const outputAmount = route.outputs?.[0]?.amount;
    return {
      txHash: hash,
      blockNumber: receipt.blockNumber,
      outputAmount: outputAmount === undefined ? undefined : parseRawAmount(outputAmount, "transaction output"),
    };
  }

  private async executeSdkTransaction(
    response: SdkTransactionResponse,
    owner: Address,
    chainId: 4663,
    marketId: string,
    runtime?: YieldAdapterRuntime,
  ): Promise<{ txHash: TransactionHash; blockNumber?: bigint }> {
    const transaction = normalizePendleTransaction(response.tx, "claim transaction");
    const verifiedRouter = getContractByName(chainId, "Pendle Router V2")?.address;
    if (!verifiedRouter || lower(transaction.to) !== lower(verifiedRouter)) {
      throw new YieldDomainError("live-source-unavailable", "Pendle returned an unverified claim router address.");
    }
    if (transaction.from && lower(transaction.from) !== lower(owner)) {
      throw new YieldDomainError("live-source-unavailable", "Pendle returned claim calldata for a different wallet.");
    }
    if (response.tokenApprovals && response.tokenApprovals.length > 0) {
      throw new YieldDomainError("unsupported-operation", "The live claim route unexpectedly requires token approval.");
    }
    const { publicClient, walletClient } = this.assertWalletRuntime(chainId, runtime);
    await this.assertNativeGasBalance(publicClient, owner);
    await validateCleaveExecution(marketId, publicClient);
    const hash = await walletClient.sendTransaction({
      account: owner,
      to: transaction.to,
      data: transaction.data,
      value: transaction.value,
      chain: walletClient.chain,
    });
    runtime?.onTransactionSubmitted?.(hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new YieldDomainError("transaction-reverted", "The live claim transaction was reverted by the network.");
    }
    return { txHash: hash, blockNumber: receipt.blockNumber };
  }

  private positionParts(positionId: string): { chainId: 4663; owner: Address; marketId: string; strategy: "fixed" | "long" } {
    const [prefix, chain, owner, marketId, strategy] = positionId.split(":");
    if (prefix !== "live" || Number(chain) !== ROBINHOOD_CHAIN_ID || !toAddress(owner) || !marketId || (strategy !== "fixed" && strategy !== "long")) {
      throw new YieldDomainError("position-not-found", "The live position identifier is invalid.");
    }
    return { chainId: ROBINHOOD_CHAIN_ID, owner: owner as Address, marketId, strategy };
  }

  private async readTokenBalance(client: PublicClient, token: Address, owner: Address): Promise<bigint> {
    return client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] });
  }

  private async apiPositions(owner: Address, chainId: 4663): Promise<ApiChainPositions | undefined> {
    const response = await this.request<PositionsResponse>(`/v1/dashboard/positions/database/${owner}?filterUsd=0`);
    return response.positions?.find((item) => Number(item.chainId) === chainId);
  }

  private claimAmount(position: ApiPosition | undefined, market: YieldMarket): number {
    if (!position?.claimTokenAmounts || !market.underlyingTokenAddress || market.underlyingDecimals === undefined) return 0;
    const claim = position.claimTokenAmounts.find((item) => {
      const address = assetAddress(item.token, market.chainId);
      return address && lower(address) === lower(market.underlyingTokenAddress!);
    });
    if (!claim) return 0;
    try {
      return Number(formatUnits(parseRawAmount(claim.amount, "claimable yield"), market.underlyingDecimals));
    } catch {
      return 0;
    }
  }

  private positionId(owner: Address, market: YieldMarket, strategy: "fixed" | "long"): string {
    return `live:${market.chainId}:${owner.toLowerCase()}:${market.id}:${strategy}`;
  }

  async getPositions(userAddress?: Address, chainId?: number, runtime?: YieldAdapterRuntime): Promise<YieldPosition[]> {
    if (!userAddress) return [];
    const selectedChain = this.getChainId(chainId);
    const markets = await this.getLiveMarkets(runtime);
    const snapshot = await this.apiPositions(userAddress, selectedChain);
    const apiPositions = new Map<string, ApiMarketPosition>();
    for (const position of [...(snapshot?.openPositions || []), ...(snapshot?.closedPositions || [])]) {
      const rawId = asString(position.marketId);
      const address = rawId ? assetAddress(rawId, selectedChain) : undefined;
      if (address) apiPositions.set(lower(address), position);
    }
    let client: PublicClient | undefined;
    try {
      client = this.resolvePublicClient(selectedChain, runtime);
    } catch {
      client = undefined;
    }
    const output: YieldPosition[] = [];
    for (const market of markets) {
      if (!market.marketAddress || !market.ptAddress || !market.ytAddress || market.ptDecimals === undefined || market.ytDecimals === undefined) continue;
      const apiPosition = apiPositions.get(lower(market.marketAddress));
      let ptRaw = apiPosition?.pt?.balance ? parseRawAmount(apiPosition.pt.balance, "PT balance") : BigInt(0);
      let ytRaw = apiPosition?.yt?.balance ? parseRawAmount(apiPosition.yt.balance, "YT balance") : BigInt(0);
      if (client) {
        const [readPt, readYt] = await Promise.all([
          this.readTokenBalance(client, market.ptAddress, userAddress).catch(() => undefined),
          this.readTokenBalance(client, market.ytAddress, userAddress).catch(() => undefined),
        ]);
        if (readPt !== undefined) ptRaw = readPt;
        if (readYt !== undefined) ytRaw = readYt;
      }
      const cleaveSummary = client
        ? await readCleaveMarketSummary(market.id, client).catch(() => undefined)
        : undefined;
      const fallbackStatus = market.status === "matured" ? "matured" : "active";
      const fixedStatus = cleaveSummary
        ? cleaveSummary.fixedState >= 2 ? "matured" : cleaveSummary.fixedState === 1 ? "active" : fallbackStatus
        : fallbackStatus;
      const longStatus = cleaveSummary
        ? cleaveSummary.tradingYieldState >= 2 ? "matured" : cleaveSummary.tradingYieldState === 1 ? "active" : fallbackStatus
        : fallbackStatus;
      if (ptRaw > BigInt(0)) {
        output.push({
          id: this.positionId(userAddress, market, "fixed"),
          owner: userAddress,
          marketId: market.id,
          assetSymbol: market.symbol,
          strategy: "fixed",
          depositedAmount: 0,
          ptAmount: Number(formatUnits(ptRaw, market.ptDecimals)),
          currentValue: asFiniteNumber(apiPosition?.pt?.valuation) || 0,
          pnl: 0,
          entryImpliedApy: market.impliedApy,
          quotedFixedApy: market.impliedApy,
          maturity: market.maturity,
          maturityDate: market.maturityDate,
          openedAt: "Live source",
          txHash: undefined,
          entryDataAvailable: false,
          status: fixedStatus,
        });
      }
      if (ytRaw > BigInt(0)) {
        output.push({
          id: this.positionId(userAddress, market, "long"),
          owner: userAddress,
          marketId: market.id,
          assetSymbol: market.symbol,
          strategy: "long",
          depositedAmount: 0,
          ytAmount: Number(formatUnits(ytRaw, market.ytDecimals)),
          currentValue: asFiniteNumber(apiPosition?.yt?.valuation) || 0,
          pnl: 0,
          claimableYield: this.claimAmount(apiPosition?.yt, market),
          entryUnderlyingApy: market.underlyingApy,
          entryImpliedApy: market.impliedApy,
          breakEvenApy: market.impliedApy,
          currentUnderlyingApy: market.underlyingApy,
          maturity: market.maturity,
          maturityDate: market.maturityDate,
          openedAt: "Live source",
          lastClaimedAt: "Live source",
          txHash: undefined,
          entryDataAvailable: false,
          status: longStatus,
        });
      }
    }
    return output;
  }

  async getClaimableYield(position: LongYieldPosition, _now?: number, runtime?: YieldAdapterRuntime): Promise<number> {
    const parts = this.positionParts(position.id);
    const positions = await this.getPositions(parts.owner, parts.chainId, runtime);
    const livePosition = positions.find((item) => item.id === position.id);
    return livePosition?.strategy === "long" ? livePosition.claimableYield : 0;
  }

  private async open(
    marketId: string,
    inputAmount: number,
    owner: Address,
    strategy: "fixed" | "long",
    quote: FixedYieldQuote | LongYieldQuote,
    chainId: number | undefined,
    runtime?: YieldAdapterRuntime,
  ): Promise<FixedYieldPosition | LongYieldPosition> {
    const selectedChain = this.getChainId(chainId);
    const market = await this.getMarketOrThrow(marketId, runtime);
    if (
      quote.marketId !== market.id ||
      quote.inputAmount !== inputAmount ||
      !Number.isFinite(quote.quoteExpiry) ||
      quote.quoteExpiry <= Date.now()
    ) {
      throw new YieldDomainError("quote-expired", "Refresh the live quote before confirming this transaction.");
    }
    if (market.status === "matured") throw new YieldDomainError("market-expired", "This live market has reached maturity.");
    if (!market.underlyingTokenAddress || market.underlyingDecimals === undefined) {
      throw new YieldDomainError("live-source-unavailable", "This live market is missing verified token metadata.");
    }
    const inputBaseUnits = displayAmountToBaseUnits(inputAmount, market.underlyingDecimals);
    const outputToken = strategy === "fixed" ? market.ptAddress : market.ytAddress;
    const outputDecimals = strategy === "fixed" ? market.ptDecimals : market.ytDecimals;
    if (!outputToken || outputDecimals === undefined) throw new YieldDomainError("live-source-unavailable", "This live market is missing PT/YT metadata.");
    await validateCleaveExecution(market.id, this.resolvePublicClient(selectedChain, runtime));
    const response = await this.convert(selectedChain, owner, market.underlyingTokenAddress, inputBaseUnits, [outputToken]);
    const execution = await this.executeTransaction(response, owner, selectedChain, market.underlyingTokenAddress, market.id, runtime);
    const outputRaw = execution.outputAmount || BigInt(0);
    const outputAmount = Number(formatUnits(outputRaw, outputDecimals));
    const txHash = execution.txHash;
    if (strategy === "fixed") {
      return {
        id: this.positionId(owner, market, "fixed"),
        owner,
        marketId: market.id,
        assetSymbol: market.symbol,
        strategy,
        depositedAmount: inputAmount,
        ptAmount: outputAmount,
        currentValue: inputAmount,
        pnl: 0,
        entryImpliedApy: market.impliedApy,
        quotedFixedApy: market.impliedApy,
        maturity: market.maturity,
        maturityDate: market.maturityDate,
        openedAt: new Date().toISOString().slice(0, 10),
        txHash,
        entryDataAvailable: true,
        status: "active",
      };
    }
    return {
      id: this.positionId(owner, market, "long"),
      owner,
      marketId: market.id,
      assetSymbol: market.symbol,
      strategy,
      depositedAmount: inputAmount,
      ytAmount: outputAmount,
      currentValue: inputAmount,
      pnl: 0,
      claimableYield: 0,
      entryUnderlyingApy: market.underlyingApy,
      entryImpliedApy: market.impliedApy,
      breakEvenApy: market.impliedApy,
      currentUnderlyingApy: market.underlyingApy,
      maturity: market.maturity,
      maturityDate: market.maturityDate,
      openedAt: new Date().toISOString().slice(0, 10),
      lastClaimedAt: new Date().toISOString().slice(0, 10),
      txHash,
      entryDataAvailable: true,
      status: "active",
    };
  }

  async openFixedPosition(marketId: string, inputAmount: number, userAddress: Address, quote: FixedYieldQuote, chainId?: number, runtime?: YieldAdapterRuntime): Promise<FixedYieldPosition> {
    return this.open(marketId, inputAmount, userAddress, "fixed", quote, chainId, runtime) as Promise<FixedYieldPosition>;
  }

  async openLongPosition(marketId: string, inputAmount: number, userAddress: Address, quote: LongYieldQuote, chainId?: number, runtime?: YieldAdapterRuntime): Promise<LongYieldPosition> {
    return this.open(marketId, inputAmount, userAddress, "long", quote, chainId, runtime) as Promise<LongYieldPosition>;
  }

  async approveToken(request: TokenApprovalRequest, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    const verifiedRouter = request.chainId === ROBINHOOD_CHAIN_ID
      ? getContractByName(ROBINHOOD_CHAIN_ID, "Pendle Router V2")?.address
      : undefined;
    if (!verifiedRouter || lower(request.spender) !== lower(verifiedRouter)) {
      throw new YieldDomainError("live-source-unavailable", "Approval spender is not a verified Pendle router.");
    }
    const { publicClient, walletClient } = this.assertWalletRuntime(request.chainId, runtime);
    if (request.amount <= BigInt(0)) throw new YieldDomainError("invalid-amount", "Approval amount must be greater than zero.");
    await this.assertNativeGasBalance(publicClient, request.owner);
    await validateCleaveExecution(request.marketId, publicClient);
    try {
      const txHash = await walletClient.writeContract({
        account: request.owner,
        address: request.tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [request.spender, request.amount],
        chain: walletClient.chain,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") throw new YieldDomainError("approval-rejected", "The approval transaction was reverted.");
      return { txHash, chainId: request.chainId, status: "confirmed", blockNumber: receipt.blockNumber, timestamp: Date.now() };
    } catch (error) {
      throw error instanceof YieldDomainError ? error : normalizeYieldError(error);
    }
  }

  async getTransactionStatus(txHash: TransactionHash, chainId: number, runtime?: YieldAdapterRuntime): Promise<TransactionReceiptResult> {
    const client = this.resolvePublicClient(this.getChainId(chainId), runtime);
    try {
      const receipt = await client.waitForTransactionReceipt({ hash: txHash });
      return { hash: txHash, chainId, status: receipt.status === "success" ? "confirmed" : "reverted", blockNumber: receipt.blockNumber, timestamp: Date.now() };
    } catch (error) {
      throw error instanceof YieldDomainError ? error : normalizeYieldError(error);
    }
  }

  async claimYield(positionId: string, userAddress: Address, chainId?: number, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    const parts = this.positionParts(positionId);
    if (parts.owner.toLowerCase() !== userAddress.toLowerCase()) throw new YieldDomainError("position-owner-mismatch", "This live position belongs to another wallet.");
    if (parts.strategy !== "long") throw new YieldDomainError("unsupported-operation", "Only YT positions can claim yield.");
    const market = await this.getMarketOrThrow(parts.marketId, runtime);
    if (!market.ytAddress || !market.syAddress) throw new YieldDomainError("unsupported-operation", "This live market does not expose a verified claim route.");
    const { publicClient } = this.assertWalletRuntime(this.getChainId(chainId), runtime);
    const lifecycle = await readCleaveLifecycle(parts.marketId, "long", publicClient);
    if (!lifecycle.claimYieldEligible) throw new YieldDomainError("nothing-claimable", "CLEAVE reports no yield available to claim for this position.");
    const before = await this.getPositions(userAddress, this.getChainId(chainId), runtime);
    const livePosition = before.find((position) => position.id === positionId);
    if (!livePosition || livePosition.strategy !== "long" || livePosition.claimableYield <= 0) throw new YieldDomainError("nothing-claimable", "The live source reports no yield available to claim.");
    const response = await this.request<SdkTransactionResponse>(`/v1/sdk/${ROBINHOOD_CHAIN_ID}/redeem-interests-and-rewards?receiver=${userAddress}&sys=${market.syAddress}&yts=${market.ytAddress}`);
    const execution = await this.executeSdkTransaction(response, userAddress, ROBINHOOD_CHAIN_ID, parts.marketId, runtime);
    return { claimedAmount: livePosition.claimableYield, txHash: execution.txHash, chainId: ROBINHOOD_CHAIN_ID, status: "confirmed", blockNumber: execution.blockNumber, timestamp: Date.now() };
  }

  async redeemFixed(positionId: string, userAddress: Address, chainId?: number, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    const parts = this.positionParts(positionId);
    if (parts.owner.toLowerCase() !== userAddress.toLowerCase()) throw new YieldDomainError("position-owner-mismatch", "This live position belongs to another wallet.");
    if (parts.strategy !== "fixed") throw new YieldDomainError("unsupported-operation", "Only PT positions can be redeemed.");
    const market = await this.getMarketOrThrow(parts.marketId, runtime);
    if (market.status !== "matured") throw new YieldDomainError("pt-not-redeemable", "PT can only be redeemed after the verified market maturity.");
    if (!market.ptAddress || !market.underlyingTokenAddress || market.ptDecimals === undefined) throw new YieldDomainError("unsupported-operation", "This live market does not expose a verified PT redemption route.");
    const { publicClient } = this.assertWalletRuntime(this.getChainId(chainId), runtime);
    const lifecycle = await readCleaveLifecycle(parts.marketId, "fixed", publicClient);
    if (!lifecycle.redeemAtMaturityEligible) throw new YieldDomainError("pt-not-redeemable", "CLEAVE reports that this PT position is not redeemable yet.");
    const amount = await this.readTokenBalance(publicClient, market.ptAddress, userAddress);
    if (amount <= BigInt(0)) throw new YieldDomainError("pt-already-redeemed", "No PT balance is available to redeem.");
    const response = await this.convert(ROBINHOOD_CHAIN_ID, userAddress, market.ptAddress, amount, [market.underlyingTokenAddress]);
    const execution = await this.executeTransaction(response, userAddress, ROBINHOOD_CHAIN_ID, market.ptAddress, parts.marketId, runtime);
    const redeemedAmount = execution.outputAmount && market.underlyingDecimals !== undefined
      ? Number(formatUnits(execution.outputAmount, market.underlyingDecimals))
      : undefined;
    return { redeemedAmount, txHash: execution.txHash, chainId: ROBINHOOD_CHAIN_ID, status: "confirmed", blockNumber: execution.blockNumber, timestamp: Date.now() };
  }

  async sellPosition(
    positionId: string,
    userAddress: Address,
    chainId?: number,
    runtime?: YieldAdapterRuntime,
    exitQuote?: ExitQuote,
  ): Promise<PositionTransactionResult> {
    if (!exitQuote) {
      throw new YieldDomainError("quote-expired", "Fetch and review a live exit quote before selling this position.");
    }
    const parts = this.positionParts(positionId);
    if (parts.owner.toLowerCase() !== userAddress.toLowerCase()) throw new YieldDomainError("position-owner-mismatch", "This live position belongs to another wallet.");
    const market = await this.getMarketOrThrow(parts.marketId, runtime);
    if (market.status === "matured") throw new YieldDomainError("position-not-sellable", "A matured live position must use its maturity action.");
    const token = parts.strategy === "fixed" ? market.ptAddress : market.ytAddress;
    if (!token || !market.underlyingTokenAddress || market.underlyingDecimals === undefined) throw new YieldDomainError("unsupported-operation", "This live market does not expose a verified sell route.");
    const { publicClient } = this.assertWalletRuntime(this.getChainId(chainId), runtime);
    const lifecycle = await readCleaveLifecycle(parts.marketId, parts.strategy, publicClient);
    if (!lifecycle.sellEarlyEligible) throw new YieldDomainError("position-not-sellable", "CLEAVE reports that this position is not eligible for early sale.");
    const amount = await this.readTokenBalance(publicClient, token, userAddress);
    if (amount <= BigInt(0)) throw new YieldDomainError("position-not-sellable", "No live token balance is available to sell.");
    if (exitQuote) {
      if (
        exitQuote.positionId !== positionId ||
        exitQuote.marketId !== parts.marketId ||
        exitQuote.chainId !== ROBINHOOD_CHAIN_ID ||
        exitQuote.quoteExpiry <= Date.now() ||
        exitQuote.inputToken.toLowerCase() !== token.toLowerCase() ||
        exitQuote.inputBaseUnits !== amount
      ) {
        throw new YieldDomainError("quote-expired", "Refresh the live exit quote before selling this position.");
      }
    }
    const response: ConvertResponse = {
      requiredApprovals: exitQuote.approvalToken && exitQuote.approvalAmount
        ? [{ token: exitQuote.approvalToken, amount: exitQuote.approvalAmount.toString() }]
        : [],
      routes: [{
        tx: exitQuote.transaction,
        outputs: [{ token: exitQuote.outputToken, amount: exitQuote.outputBaseUnits.toString() }],
      }],
    };
    const execution = await this.executeTransaction(
      response,
      userAddress,
      ROBINHOOD_CHAIN_ID,
      token,
      parts.marketId,
      runtime,
      { allowApproval: false },
    );
    const returnedAmount = execution.outputAmount ? Number(formatUnits(execution.outputAmount, market.underlyingDecimals)) : undefined;
    return { returnedAmount, txHash: execution.txHash, chainId: ROBINHOOD_CHAIN_ID, status: "confirmed", blockNumber: execution.blockNumber, timestamp: Date.now() };
  }
}

export const pendleLiveYieldAdapter = new PendleLiveYieldMarketAdapter();
