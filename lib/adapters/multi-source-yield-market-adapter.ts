import {
  createPublicClient,
  http,
  isAddress,
  type Address,
  type PublicClient,
} from "viem";
import { YieldDomainError } from "@/types/errors";
import { getConfiguredChainId } from "@/lib/web3/environment";
import { robinhoodChain, ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";
import {
  getStableExternalMarketId,
  MARKET_DIRECTORY_MARKET_TYPES,
  MARKET_DIRECTORY_PROVIDER_IDS,
  readYeltraMarketDirectory,
} from "@/lib/markets/market-directory";
import { MorphoYieldMarketAdapter } from "./morpho-yield-market-adapter";
import { pendleLiveYieldAdapter } from "./pendle-live-adapter";
import type {
  ExitQuote,
  FixedYieldQuote,
  LongYieldQuote,
} from "@/types/quote";
import type { FixedYieldPosition, LongYieldPosition, YieldPosition } from "@/types/position";
import type { TokenApprovalRequest, TransactionHash, TransactionReceiptResult } from "@/types/transaction";
import type { YieldMarket } from "@/types/market";
import type {
  PositionTransactionResult,
  YieldAdapterRuntime,
  YieldMarketAdapter,
} from "./types";

const DEFAULT_MAINNET_RPC = "https://rpc.mainnet.chain.robinhood.com";

export function getConfiguredMarketDirectoryAddress(chainId = getConfiguredChainId()): Address | undefined {
  const configured = chainId === ROBINHOOD_CHAIN_ID
    ? process.env.NEXT_PUBLIC_YELTRA_MARKET_DIRECTORY || process.env.YELTRA_MARKET_DIRECTORY
    : process.env.NEXT_PUBLIC_YELTRA_MARKET_DIRECTORY_TESTNET || process.env.YELTRA_MARKET_DIRECTORY_TESTNET;
  return configured && isAddress(configured.trim()) ? configured.trim() as Address : undefined;
}

function getRpcUrl(chainId: number): string {
  const configured = chainId === ROBINHOOD_CHAIN_ID
    ? process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL
    : process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL;
  return configured?.trim() || (chainId === ROBINHOOD_CHAIN_ID ? DEFAULT_MAINNET_RPC : "");
}

function createDirectoryClient(chainId: number): PublicClient {
  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) throw new YieldDomainError("live-source-unavailable", "A Robinhood Chain RPC URL is required for the YELTRA market directory.");
  return createPublicClient({ chain: robinhoodChain, transport: http(rpcUrl) });
}

function isMorphoMarketId(id: string): boolean {
  return id.toLowerCase().startsWith("morpho:");
}

function uniqueMarkets(markets: YieldMarket[]): YieldMarket[] {
  const byId = new Map<string, YieldMarket>();
  for (const market of markets) byId.set(market.id.toLowerCase(), market);
  return [...byId.values()];
}

export class MultiSourceYieldMarketAdapter implements YieldMarketAdapter {
  readonly mode = "live" as const;

  constructor(
    private readonly pendle = pendleLiveYieldAdapter,
    private readonly directoryAddress?: Address,
  ) {}

  private resolveDirectoryAddress(): Address | undefined {
    return this.directoryAddress || getConfiguredMarketDirectoryAddress();
  }

  private async getMorphoMarkets(): Promise<YieldMarket[]> {
    const directoryAddress = this.resolveDirectoryAddress();
    if (!directoryAddress) return [];
    const client = createDirectoryClient(ROBINHOOD_CHAIN_ID);
    const entries = await readYeltraMarketDirectory(client, directoryAddress);
    const morphoAdapter = new MorphoYieldMarketAdapter(client);
    const markets: YieldMarket[] = [];
    for (const entry of entries) {
      if (!entry.enabled || entry.chainId !== ROBINHOOD_CHAIN_ID) continue;
      if (entry.providerId.toLowerCase() !== MARKET_DIRECTORY_PROVIDER_IDS.MORPHO.toLowerCase()) continue;
      if (entry.marketType.toLowerCase() !== MARKET_DIRECTORY_MARKET_TYPES.VAULT.toLowerCase()) continue;
      markets.push(await morphoAdapter.getMarket(entry, directoryAddress));
    }
    return markets;
  }

  async getMarkets(): Promise<YieldMarket[]> {
    const [pendleResult, externalResult] = await Promise.allSettled([
      this.pendle.getMarkets(),
      this.getMorphoMarkets(),
    ]);
    const pendleMarkets = pendleResult.status === "fulfilled" ? pendleResult.value : [];
    const externalMarkets = externalResult.status === "fulfilled" ? externalResult.value : [];
    if (pendleMarkets.length || externalMarkets.length) return uniqueMarkets([...pendleMarkets, ...externalMarkets]);
    const reason = pendleResult.status === "rejected" ? pendleResult.reason : externalResult.status === "rejected" ? externalResult.reason : undefined;
    throw reason instanceof Error
      ? reason
      : new YieldDomainError("live-source-unavailable", "No enabled YELTRA market provider is available.");
  }

  async getMarket(id: string): Promise<YieldMarket | null> {
    if (!isMorphoMarketId(id)) return this.pendle.getMarket(id);
    const directoryAddress = this.resolveDirectoryAddress();
    if (!directoryAddress) return null;
    const client = createDirectoryClient(ROBINHOOD_CHAIN_ID);
    const entries = await readYeltraMarketDirectory(client, directoryAddress);
    const entry = entries.find(
      (candidate) => getStableExternalMarketId(candidate.providerId, candidate.chainId, candidate.marketAddress).toLowerCase() === id.toLowerCase(),
    );
    if (!entry || !entry.enabled) return null;
    return new MorphoYieldMarketAdapter(client).getMarket(entry, directoryAddress);
  }

  private assertPendleExecution(marketId: string): void {
    if (isMorphoMarketId(marketId)) {
      throw new YieldDomainError("unsupported-operation", "Morpho vault discovery is available, but YELTRA execution is not configured for this provider.");
    }
  }

  getPositions(userAddress?: `0x${string}`, chainId?: number, runtime?: YieldAdapterRuntime): Promise<YieldPosition[]> {
    return this.pendle.getPositions(userAddress, chainId, runtime);
  }

  async getFixedQuote(marketId: string, inputAmount: number, runtime?: YieldAdapterRuntime): Promise<FixedYieldQuote> {
    this.assertPendleExecution(marketId);
    return this.pendle.getFixedQuote(marketId, inputAmount, runtime);
  }

  async getLongQuote(marketId: string, inputAmount: number, runtime?: YieldAdapterRuntime): Promise<LongYieldQuote> {
    this.assertPendleExecution(marketId);
    return this.pendle.getLongQuote(marketId, inputAmount, runtime);
  }

  getExitQuote(positionId: string, userAddress: `0x${string}`, chainId?: number, runtime?: YieldAdapterRuntime): Promise<ExitQuote> {
    return this.pendle.getExitQuote(positionId, userAddress, chainId, runtime);
  }

  async openFixedPosition(marketId: string, inputAmount: number, userAddress: `0x${string}`, quote: FixedYieldQuote, chainId?: number, runtime?: YieldAdapterRuntime): Promise<FixedYieldPosition> {
    this.assertPendleExecution(marketId);
    return this.pendle.openFixedPosition(marketId, inputAmount, userAddress, quote, chainId, runtime);
  }

  async openLongPosition(marketId: string, inputAmount: number, userAddress: `0x${string}`, quote: LongYieldQuote, chainId?: number, runtime?: YieldAdapterRuntime): Promise<LongYieldPosition> {
    this.assertPendleExecution(marketId);
    return this.pendle.openLongPosition(marketId, inputAmount, userAddress, quote, chainId, runtime);
  }

  getClaimableYield(position: LongYieldPosition, now?: number, runtime?: YieldAdapterRuntime): Promise<number> {
    return this.pendle.getClaimableYield(position, now, runtime);
  }

  approveToken(request: TokenApprovalRequest, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    return this.pendle.approveToken(request, runtime);
  }

  getTransactionStatus(txHash: TransactionHash, chainId: number, runtime?: YieldAdapterRuntime): Promise<TransactionReceiptResult> {
    return this.pendle.getTransactionStatus(txHash, chainId, runtime);
  }

  claimYield(positionId: string, userAddress: `0x${string}`, chainId?: number, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    return this.pendle.claimYield(positionId, userAddress, chainId, runtime);
  }

  redeemFixed(positionId: string, userAddress: `0x${string}`, chainId?: number, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    return this.pendle.redeemFixed(positionId, userAddress, chainId, runtime);
  }

  sellPosition(positionId: string, userAddress: `0x${string}`, chainId?: number, runtime?: YieldAdapterRuntime, exitQuote?: ExitQuote): Promise<PositionTransactionResult> {
    return this.pendle.sellPosition(positionId, userAddress, chainId, runtime, exitQuote);
  }
}

export const multiSourceYieldAdapter = new MultiSourceYieldMarketAdapter();
