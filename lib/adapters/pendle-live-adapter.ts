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
import { normalizeYieldError, YieldDomainError } from "@/types/errors";
import type { YieldMarket } from "@/types/market";
import type { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
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
  pendleAssets: Map<string, { decimals: number; symbol: string; name: string }>,
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
  if (!ptMeta || !ytMeta) return null;

  const sourceProtocol = "Pendle";
  const utilizedProtocol = raw.marketInfo?.utilizedProtocols?.[0];
  const yieldSource = asString(utilizedProtocol?.name) || asString(raw.protocol) || sourceProtocol;
  const description = asString(raw.marketInfo?.assetDescription);
  const name = asString(raw.name) || underlying.name;

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
  ): Promise<Map<string, { decimals: number; symbol: string; name: string }>> {
    const ids = markets.flatMap((market) => [market.pt, market.yt, market.sy])
      .map((value) => {
        const address = assetAddress(value, chainId);
        return address ? assetId(address, chainId) : undefined;
      })
      .filter((value): value is string => Boolean(value));
    const uniqueIds = [...new Set(ids)];
    const assets = new Map<string, { decimals: number; symbol: string; name: string }>();
    for (let index = 0; index < uniqueIds.length; index += 20) {
      const chunk = uniqueIds.slice(index, index + 20).join(",");
      const response = await this.request<AssetResponse>(`/v1/assets/all?ids=${encodeURIComponent(chunk)}`);
      for (const asset of response.assets || []) {
        const address = toAddress(asset.address);
        const decimals = asFiniteNumber(asset.decimals);
        const symbol = asString(asset.symbol);
        const name = asString(asset.name);
        if (address && decimals !== undefined && symbol && name && Number.isInteger(decimals)) {
          assets.set(lower(address), { decimals, symbol, name });
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
        const fallbackName = asString(raw.name);
        const underlying = await this.readUnderlyingMetadata(
          underlyingAddress,
          chainId,
          runtime,
          { symbol: fallbackName, name: fallbackName },
        );
        return normalizePendleMarket(raw, chainId, underlying, pendleAssets);
      } catch {
        return null;
      }
    }));
    const markets = normalized.filter((market): market is YieldMarket => Boolean(market));
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
    return markets[0] || null;
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

  private assertWalletRuntime(chainId: number, runtime?: YieldAdapterRuntime): { publicClient: PublicClient; walletClient: WalletClient } {
    const publicClient = this.resolvePublicClient(chainId, runtime);
    const walletClient = runtime?.walletClient;
    if (!walletClient) throw new YieldDomainError("wallet-disconnected", "Connect a wallet to submit a live transaction.");
    if (walletClient.chain?.id && walletClient.chain.id !== chainId) {
      throw new YieldDomainError("wrong-network", "Switch your wallet to Robinhood Chain Mainnet.");
    }
    return { publicClient, walletClient };
  }

  private async executeTransaction(
    response: ConvertResponse,
    owner: Address,
    chainId: 4663,
    runtime?: YieldAdapterRuntime,
  ): Promise<{ txHash: TransactionHash; blockNumber?: bigint; outputAmount?: bigint }> {
    const { publicClient, walletClient } = this.assertWalletRuntime(chainId, runtime);
    const route = this.getRoute(response);
    const txTo = toAddress(route.tx?.to);
    const txData = toHex(route.tx?.data);
    const txValue = asString(route.tx?.value);
    if (!txTo || !txData || txValue === undefined) {
      throw new YieldDomainError("live-source-unavailable", "Pendle returned invalid transaction calldata.");
    }
    for (const approval of response.requiredApprovals || []) {
      const token = toAddress(approval.token);
      const amount = parseRawAmount(approval.amount, "approval");
      if (!token) throw new YieldDomainError("live-source-unavailable", "Pendle returned an invalid approval token.");
      const allowance = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, txTo],
      });
      if (allowance < amount) {
        const approvalHash = await walletClient.writeContract({
          account: owner,
          address: token,
          abi: erc20Abi,
          functionName: "approve",
          args: [txTo, amount],
          chain: walletClient.chain,
        });
        const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        if (approvalReceipt.status !== "success") {
          throw new YieldDomainError("approval-rejected", "The token approval transaction was reverted.");
        }
      }
    }
    const hash = await walletClient.sendTransaction({
      account: owner,
      to: txTo,
      data: txData,
      value: BigInt(txValue),
      chain: walletClient.chain,
    });
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
    runtime?: YieldAdapterRuntime,
  ): Promise<{ txHash: TransactionHash; blockNumber?: bigint }> {
    const { publicClient, walletClient } = this.assertWalletRuntime(chainId, runtime);
    const txTo = toAddress(response.tx?.to);
    const txData = toHex(response.tx?.data);
    const txValue = asString(response.tx?.value);
    if (!txTo || !txData || txValue === undefined) {
      throw new YieldDomainError("live-source-unavailable", "Pendle returned invalid claim transaction calldata.");
    }
    const hash = await walletClient.sendTransaction({
      account: owner,
      to: txTo,
      data: txData,
      value: BigInt(txValue),
      chain: walletClient.chain,
    });
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
      const status = market.status === "matured" ? "matured" : "active";
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
          status,
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
          status,
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
    runtime?: YieldAdapterRuntime,
  ): Promise<FixedYieldPosition | LongYieldPosition> {
    const market = await this.getMarketOrThrow(marketId, runtime);
    if (market.status === "matured") throw new YieldDomainError("market-expired", "This live market has reached maturity.");
    if (!market.underlyingTokenAddress || market.underlyingDecimals === undefined) {
      throw new YieldDomainError("live-source-unavailable", "This live market is missing verified token metadata.");
    }
    const inputBaseUnits = displayAmountToBaseUnits(inputAmount, market.underlyingDecimals);
    const outputToken = strategy === "fixed" ? market.ptAddress : market.ytAddress;
    const outputDecimals = strategy === "fixed" ? market.ptDecimals : market.ytDecimals;
    if (!outputToken || outputDecimals === undefined) throw new YieldDomainError("live-source-unavailable", "This live market is missing PT/YT metadata.");
    const response = await this.convert(ROBINHOOD_CHAIN_ID, owner, market.underlyingTokenAddress, inputBaseUnits, [outputToken]);
    const execution = await this.executeTransaction(response, owner, ROBINHOOD_CHAIN_ID, runtime);
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

  async openFixedPosition(marketId: string, inputAmount: number, userAddress: Address, _quote: FixedYieldQuote, _chainId?: number, runtime?: YieldAdapterRuntime): Promise<FixedYieldPosition> {
    return this.open(marketId, inputAmount, userAddress, "fixed", runtime) as Promise<FixedYieldPosition>;
  }

  async openLongPosition(marketId: string, inputAmount: number, userAddress: Address, _quote: LongYieldQuote, _chainId?: number, runtime?: YieldAdapterRuntime): Promise<LongYieldPosition> {
    return this.open(marketId, inputAmount, userAddress, "long", runtime) as Promise<LongYieldPosition>;
  }

  async approveToken(request: TokenApprovalRequest, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    const { publicClient, walletClient } = this.assertWalletRuntime(request.chainId, runtime);
    if (request.amount <= BigInt(0)) throw new YieldDomainError("invalid-amount", "Approval amount must be greater than zero.");
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
    const before = await this.getPositions(userAddress, this.getChainId(chainId), runtime);
    const livePosition = before.find((position) => position.id === positionId);
    if (!livePosition || livePosition.strategy !== "long" || livePosition.claimableYield <= 0) throw new YieldDomainError("nothing-claimable", "The live source reports no yield available to claim.");
    const response = await this.request<SdkTransactionResponse>(`/v1/sdk/${ROBINHOOD_CHAIN_ID}/redeem-interests-and-rewards?receiver=${userAddress}&sys=${market.syAddress}&yts=${market.ytAddress}`);
    const execution = await this.executeSdkTransaction(response, userAddress, ROBINHOOD_CHAIN_ID, runtime);
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
    const amount = await this.readTokenBalance(publicClient, market.ptAddress, userAddress);
    if (amount <= BigInt(0)) throw new YieldDomainError("pt-already-redeemed", "No PT balance is available to redeem.");
    const response = await this.convert(ROBINHOOD_CHAIN_ID, userAddress, market.ptAddress, amount, [market.underlyingTokenAddress]);
    const execution = await this.executeTransaction(response, userAddress, ROBINHOOD_CHAIN_ID, runtime);
    const redeemedAmount = execution.outputAmount && market.underlyingDecimals !== undefined
      ? Number(formatUnits(execution.outputAmount, market.underlyingDecimals))
      : undefined;
    return { redeemedAmount, txHash: execution.txHash, chainId: ROBINHOOD_CHAIN_ID, status: "confirmed", blockNumber: execution.blockNumber, timestamp: Date.now() };
  }

  async sellPosition(positionId: string, userAddress: Address, chainId?: number, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    const parts = this.positionParts(positionId);
    if (parts.owner.toLowerCase() !== userAddress.toLowerCase()) throw new YieldDomainError("position-owner-mismatch", "This live position belongs to another wallet.");
    const market = await this.getMarketOrThrow(parts.marketId, runtime);
    const token = parts.strategy === "fixed" ? market.ptAddress : market.ytAddress;
    if (!token || !market.underlyingTokenAddress || market.underlyingDecimals === undefined) throw new YieldDomainError("unsupported-operation", "This live market does not expose a verified sell route.");
    const { publicClient } = this.assertWalletRuntime(this.getChainId(chainId), runtime);
    const amount = await this.readTokenBalance(publicClient, token, userAddress);
    if (amount <= BigInt(0)) throw new YieldDomainError("position-not-sellable", "No live token balance is available to sell.");
    const response = await this.convert(ROBINHOOD_CHAIN_ID, userAddress, token, amount, [market.underlyingTokenAddress]);
    const execution = await this.executeTransaction(response, userAddress, ROBINHOOD_CHAIN_ID, runtime);
    const returnedAmount = execution.outputAmount ? Number(formatUnits(execution.outputAmount, market.underlyingDecimals)) : undefined;
    return { returnedAmount, txHash: execution.txHash, chainId: ROBINHOOD_CHAIN_ID, status: "confirmed", blockNumber: execution.blockNumber, timestamp: Date.now() };
  }
}

export const pendleLiveYieldAdapter = new PendleLiveYieldMarketAdapter();
