import { YieldDomainError } from "@/types/errors";
import { MOCK_MARKETS } from "@/lib/markets/mock-markets";
import { YieldMarket } from "@/types/market";
import { ExitQuote, FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import {
  FixedYieldPosition,
  LongYieldPosition,
  YieldPosition,
} from "@/types/position";
import {
  getMarketStatus,
  getTimeToMaturity,
  isMarketTradable,
} from "@/lib/markets/status";
import {
  canClaimYield,
  canRedeemFixed,
  canSellPosition,
  getClaimableYield as calculateClaimableYield,
  refreshPositionValuation,
} from "@/lib/positions/valuation";
import {
  calculateFixedQuote,
  calculateLongQuote,
} from "@/lib/quotes/mock-quotes";
import {
  balanceAdapter,
  MOCK_NETWORK_FEE_ETH,
} from "@/lib/adapters/balance-adapter";
import { isSupportedRobinhoodChain } from "@/lib/web3/chains";
import { pendleLiveYieldAdapter } from "./pendle-live-adapter";
import { getConfiguredDataMode } from "./config";
import { PositionTransactionResult, YieldMarketAdapter, YieldAdapterRuntime } from "./types";
import { TokenApprovalRequest, TransactionHash, TransactionReceiptResult } from "@/types/transaction";

const STORAGE_PREFIX = "cleave:mock-positions:v1:";
const QUOTE_TTL_MS = 30_000;
const MOCK_INITIAL_CLAIMABLE_YIELD_RATE = 0.01;
const MOCK_EXIT_ADDRESS = "0x0000000000000000000000000000000000000001" as `0x${string}`;
const DEMO_OWNER =
  "0x000000000000000000000000000000000000dEaD" as `0x${string}`;

const MOCK_TX_HASHES = {
  approve:
    "0x0000000000000000000000000000000000000000000000000000000000000001" as `0x${string}`,
  openFixed:
    "0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`,
  openLong:
    "0x2222222222222222222222222222222222222222222222222222222222222222" as `0x${string}`,
  claim:
    "0x3333333333333333333333333333333333333333333333333333333333333333" as `0x${string}`,
  redeem:
    "0x4444444444444444444444444444444444444444444444444444444444444444" as `0x${string}`,
  sell: "0x5555555555555555555555555555555555555555555555555555555555555555" as `0x${string}`,
};

function round(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

function clonePosition(position: YieldPosition): YieldPosition {
  return { ...position };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isHex32(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function isPositionRecord(value: unknown): value is YieldPosition {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<YieldPosition>;
  const commonValid =
    typeof candidate.id === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(candidate.owner ?? "") &&
    typeof candidate.marketId === "string" &&
    (candidate.strategy === "fixed" || candidate.strategy === "long") &&
    typeof candidate.maturityDate === "string" &&
    typeof candidate.openedAt === "string" &&
    isHex32(candidate.mockTxHash) &&
    ["active", "matured", "closed", "redeemed"].includes(
      candidate.status as string,
    ) &&
    isFiniteNumber(candidate.depositedAmount) &&
    isFiniteNumber(candidate.currentValue) &&
    isFiniteNumber(candidate.pnl);
  if (!commonValid) return false;
  if (candidate.strategy === "fixed") {
    const fixed = candidate as Partial<FixedYieldPosition>;
    return (
      isFiniteNumber(fixed.ptAmount) &&
      isFiniteNumber(fixed.entryImpliedApy) &&
      isFiniteNumber(fixed.quotedFixedApy)
    );
  }
  if (candidate.strategy === "long") {
    const long = candidate as Partial<LongYieldPosition>;
    return (
      isFiniteNumber(long.ytAmount) &&
      isFiniteNumber(long.claimableYield) &&
      isFiniteNumber(long.entryUnderlyingApy) &&
      isFiniteNumber(long.entryImpliedApy) &&
      isFiniteNumber(long.breakEvenApy) &&
      isFiniteNumber(long.currentUnderlyingApy) &&
      typeof long.lastClaimedAt === "string"
    );
  }
  return false;
}

export { MOCK_MARKETS };

export class MockYieldMarketAdapter implements YieldMarketAdapter {
  readonly mode = "mock" as const;
  private readonly markets: YieldMarket[] = [...MOCK_MARKETS];
  private readonly positionsByOwner = new Map<string, YieldPosition[]>();
  private positionSequence = 0;

  private ownerKey(userAddress?: `0x${string}`): string {
    return (userAddress || DEMO_OWNER).toLowerCase();
  }

  private storageKey(owner: string): string {
    return `${STORAGE_PREFIX}${owner}`;
  }

  private readStoredPositions(owner: string): YieldPosition[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(this.storageKey(owner));
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (
        !Array.isArray(parsed) ||
        !parsed.every(
          (position) =>
            isPositionRecord(position) &&
            position.owner.toLowerCase() === owner.toLowerCase(),
        )
      ) {
        window.localStorage.removeItem(this.storageKey(owner));
        return [];
      }
      return parsed as YieldPosition[];
    } catch {
      try {
        window.localStorage.removeItem(this.storageKey(owner));
      } catch {
        // Storage can be blocked by privacy settings; memory fallback remains valid.
      }
      return [];
    }
  }

  private persistPositions(owner: string, positions: YieldPosition[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        this.storageKey(owner),
        JSON.stringify(positions),
      );
    } catch {
      // localStorage is an enhancement, never a prerequisite for the mock flow.
    }
  }

  private positionsForOwner(userAddress: `0x${string}`): YieldPosition[] {
    const owner = this.ownerKey(userAddress);
    const existing = this.positionsByOwner.get(owner);
    if (existing) return existing;
    const positions = this.readStoredPositions(owner);
    this.positionsByOwner.set(owner, positions);
    return positions;
  }

  private resolveMarket(marketId: string): YieldMarket {
    const market = this.markets.find((candidate) => candidate.id === marketId);
    if (!market) {
      throw new YieldDomainError(
        "market-not-found",
        "This yield market could not be found.",
      );
    }
    const status = getMarketStatus(market);
    return {
      ...market,
      status,
      daysRemaining: getTimeToMaturity(market.maturityDate).days,
    };
  }

  private requireOwner(userAddress?: `0x${string}`): `0x${string}` {
    if (!userAddress) {
      throw new YieldDomainError(
        "wallet-disconnected",
        "Connect a wallet to perform this action.",
      );
    }
    return userAddress;
  }

  private requireNetwork(chainId?: number): void {
    if (!isSupportedRobinhoodChain(chainId)) {
      throw new YieldDomainError(
        "wrong-network",
        "Switch your wallet to Robinhood Chain before continuing.",
      );
    }
  }

  private assertValidAmount(inputAmount: number): void {
    if (!Number.isFinite(inputAmount) || inputAmount <= 0) {
      throw new YieldDomainError(
        "invalid-amount",
        "Enter an amount greater than zero.",
      );
    }
  }

  private assertOptionalNetwork(chainId?: number): void {
    if (chainId !== undefined) this.requireNetwork(chainId);
  }

  private assertTradable(market: YieldMarket, inputAmount: number): void {
    if (market.status === "paused") {
      throw new YieldDomainError(
        "market-paused",
        "This market is currently paused.",
      );
    }
    if (!isMarketTradable(market)) {
      throw new YieldDomainError(
        "market-expired",
        "This market has passed maturity.",
      );
    }
    if (market.liquidityUsd <= 0 || inputAmount > market.liquidityUsd) {
      throw new YieldDomainError(
        "insufficient-liquidity",
        "This trade is larger than the available market liquidity.",
      );
    }
  }

  private assertQuote(
    quote: FixedYieldQuote | LongYieldQuote,
    marketId: string,
    inputAmount: number,
  ): void {
    if (
      !quote ||
      quote.marketId !== marketId ||
      quote.inputAmount !== inputAmount ||
      !Number.isFinite(quote.quoteTimestamp) ||
      !Number.isFinite(quote.quoteExpiry) ||
      quote.quoteExpiry <= Date.now()
    ) {
      throw new YieldDomainError(
        "quote-expired",
        "This quote has expired. Refresh the quote before confirming.",
      );
    }
  }

  private async assertFunding(
    owner: `0x${string}`,
    market: YieldMarket,
    inputAmount: number,
  ): Promise<void> {
    const tokenBalance = await balanceAdapter.getTokenBalance(
      owner,
      market.quoteAsset,
    );
    if (inputAmount > tokenBalance) {
      throw new YieldDomainError(
        "insufficient-token-balance",
        `Insufficient ${market.quoteAsset} balance for this trade.`,
      );
    }
    const gasBalance = await balanceAdapter.getGasBalance(owner);
    if (gasBalance < MOCK_NETWORK_FEE_ETH) {
      throw new YieldDomainError(
        "insufficient-eth-for-gas",
        "You need more ETH in your wallet to pay the network fee.",
      );
    }
  }

  private findOwnedPosition(
    positionId: string,
    owner: `0x${string}`,
  ): { position: YieldPosition; ownerKey: string } {
    const ownerKey = this.ownerKey(owner);
    const positions = this.positionsForOwner(owner);
    const index = positions.findIndex(
      (candidate) => candidate.id === positionId,
    );
    if (index !== -1) {
      const refreshed = refreshPositionValuation(positions[index]);
      positions[index] = refreshed;
      return { position: refreshed, ownerKey };
    }

    for (const [
      knownOwner,
      knownPositions,
    ] of this.positionsByOwner.entries()) {
      if (
        knownOwner !== ownerKey &&
        knownPositions.some((candidate) => candidate.id === positionId)
      ) {
        throw new YieldDomainError(
          "position-owner-mismatch",
          "This wallet does not own the selected position.",
        );
      }
    }
    throw new YieldDomainError(
      "position-not-found",
      "This position could not be found.",
    );
  }

  async getMarkets(): Promise<YieldMarket[]> {
    return this.markets.map((market) => {
      const status = getMarketStatus(market);
      return {
        ...market,
        status,
        daysRemaining: getTimeToMaturity(market.maturityDate).days,
      };
    });
  }

  async getMarket(id: string): Promise<YieldMarket | null> {
    try {
      return this.resolveMarket(id);
    } catch (error) {
      if (
        error instanceof YieldDomainError &&
        error.code === "market-not-found"
      )
        return null;
      throw error;
    }
  }

  async getPositions(
    userAddress?: `0x${string}`,
    _chainId?: number,
  ): Promise<YieldPosition[]> {
    if (!userAddress) return [];
    const owner = this.ownerKey(userAddress);
    const positions = this.positionsForOwner(userAddress);
    const refreshed = positions.map((position) =>
      refreshPositionValuation(position),
    );
    positions.splice(0, positions.length, ...refreshed);
    this.persistPositions(owner, positions);
    return positions.map(clonePosition);
  }

  async approveToken(request: TokenApprovalRequest): Promise<PositionTransactionResult> {
    this.requireNetwork(request.chainId);
    if (request.amount <= BigInt(0)) {
      throw new YieldDomainError("invalid-amount", "Approval amount must be greater than zero.");
    }
    return {
      txHash: MOCK_TX_HASHES.approve,
      chainId: request.chainId,
      status: "confirmed",
      timestamp: Date.now(),
    };
  }

  async getTransactionStatus(
    txHash: TransactionHash,
    chainId: number,
  ): Promise<TransactionReceiptResult> {
    this.requireNetwork(chainId);
    if (!txHash) {
      throw new YieldDomainError("transaction-not-found", "The transaction hash is missing.");
    }
    return { hash: txHash, chainId, status: "confirmed", timestamp: Date.now() };
  }

  async getFixedQuote(
    marketId: string,
    inputAmount: number,
  ): Promise<FixedYieldQuote> {
    this.assertValidAmount(inputAmount);
    const market = this.resolveMarket(marketId);
    this.assertTradable(market, inputAmount);
    const quoteTimestamp = Date.now();
    return {
      ...calculateFixedQuote(market, inputAmount),
      marketId,
      networkFeeEstimate: MOCK_NETWORK_FEE_ETH,
      quoteTimestamp,
      quoteExpiry: quoteTimestamp + QUOTE_TTL_MS,
    };
  }

  async getLongQuote(
    marketId: string,
    inputAmount: number,
  ): Promise<LongYieldQuote> {
    this.assertValidAmount(inputAmount);
    const market = this.resolveMarket(marketId);
    this.assertTradable(market, inputAmount);
    const quoteTimestamp = Date.now();
    return {
      ...calculateLongQuote(market, inputAmount),
      marketId,
      networkFeeEstimate: MOCK_NETWORK_FEE_ETH,
      quoteTimestamp,
      quoteExpiry: quoteTimestamp + QUOTE_TTL_MS,
    };
  }

  async getExitQuote(
    positionId: string,
    userAddress: `0x${string}`,
    chainId?: number,
  ): Promise<ExitQuote> {
    const owner = this.requireOwner(userAddress);
    this.assertOptionalNetwork(chainId);
    const { position } = this.findOwnedPosition(positionId, owner);
    if (!canSellPosition(position)) {
      throw new YieldDomainError(
        "position-not-sellable",
        "Only an active position can be sold before maturity.",
      );
    }
    const market = this.resolveMarket(position.marketId);
    const inputAmount = position.strategy === "fixed" ? position.ptAmount : position.ytAmount;
    const claimable = position.strategy === "long" ? position.claimableYield : 0;
    const outputAmount = round(position.currentValue + claimable);
    const quoteTimestamp = Date.now();
    return {
      quoteId: `mock-exit:${position.id}:${quoteTimestamp}`,
      positionId: position.id,
      marketId: position.marketId,
      chainId: chainId ?? 0,
      inputToken: MOCK_EXIT_ADDRESS,
      inputSymbol: position.strategy === "fixed" ? "PT" : "YT",
      inputAmount,
      outputToken: MOCK_EXIT_ADDRESS,
      outputSymbol: market.quoteAsset,
      outputAmount,
      minimumReceived: round(outputAmount * 0.99, 4),
      priceImpact: 0,
      networkFeeEstimate: MOCK_NETWORK_FEE_ETH,
      maturity: position.maturity,
      quoteTimestamp,
      quoteExpiry: quoteTimestamp + QUOTE_TTL_MS,
      inputBaseUnits: BigInt(Math.max(0, Math.round(inputAmount * 1_000_000))),
      outputBaseUnits: BigInt(Math.max(0, Math.round(outputAmount * 1_000_000))),
      spender: MOCK_EXIT_ADDRESS,
      transaction: { to: MOCK_EXIT_ADDRESS, data: "0x", value: BigInt(0) },
    };
  }

  async openFixedPosition(
    marketId: string,
    inputAmount: number,
    userAddress: `0x${string}`,
    quote: FixedYieldQuote,
    chainId?: number,
  ): Promise<FixedYieldPosition> {
    const owner = this.requireOwner(userAddress);
    this.requireNetwork(chainId);
    this.assertValidAmount(inputAmount);
    const market = this.resolveMarket(marketId);
    this.assertTradable(market, inputAmount);
    this.assertQuote(quote, marketId, inputAmount);
    await this.assertFunding(owner, market, inputAmount);

    const now = new Date().toISOString();
    const position: FixedYieldPosition = {
      id: `pos-fixed-${Date.now()}-${this.positionSequence++}`,
      owner,
      marketId,
      assetSymbol: market.symbol,
      strategy: "fixed",
      depositedAmount: inputAmount,
      ptAmount: quote.ptReceived,
      currentValue: inputAmount,
      pnl: 0,
      entryImpliedApy: quote.impliedApy,
      quotedFixedApy: quote.quotedFixedApy,
      maturity: market.maturity,
      maturityDate: market.maturityDate,
      openedAt: now,
      mockTxHash: MOCK_TX_HASHES.openFixed,
      status: "active",
    };
    const ownerKey = this.ownerKey(owner);
    const positions = this.positionsForOwner(owner);
    positions.unshift(position);
    this.persistPositions(ownerKey, positions);
    return clonePosition(position) as FixedYieldPosition;
  }

  async openLongPosition(
    marketId: string,
    inputAmount: number,
    userAddress: `0x${string}`,
    quote: LongYieldQuote,
    chainId?: number,
  ): Promise<LongYieldPosition> {
    const owner = this.requireOwner(userAddress);
    this.requireNetwork(chainId);
    this.assertValidAmount(inputAmount);
    const market = this.resolveMarket(marketId);
    this.assertTradable(market, inputAmount);
    this.assertQuote(quote, marketId, inputAmount);
    await this.assertFunding(owner, market, inputAmount);

    const now = new Date().toISOString();
    const position: LongYieldPosition = {
      id: `pos-long-${Date.now()}-${this.positionSequence++}`,
      owner,
      marketId,
      assetSymbol: market.symbol,
      strategy: "long",
      depositedAmount: inputAmount,
      ytAmount: quote.ytReceived,
      currentValue: inputAmount,
      pnl: 0,
      // Seed a small deterministic amount so the mock demo can exercise Claim
      // Yield immediately; real adapters derive this from protocol accrual.
      claimableYield: round(inputAmount * MOCK_INITIAL_CLAIMABLE_YIELD_RATE),
      entryUnderlyingApy: quote.underlyingApy,
      entryImpliedApy: quote.impliedApy,
      breakEvenApy: quote.estimatedBreakEvenApy,
      currentUnderlyingApy: quote.underlyingApy,
      maturity: market.maturity,
      maturityDate: market.maturityDate,
      openedAt: now,
      lastClaimedAt: now,
      mockTxHash: MOCK_TX_HASHES.openLong,
      status: "active",
    };
    const ownerKey = this.ownerKey(owner);
    const positions = this.positionsForOwner(owner);
    positions.unshift(position);
    this.persistPositions(ownerKey, positions);
    return clonePosition(position) as LongYieldPosition;
  }

  async getClaimableYield(
    position: LongYieldPosition,
    now = Date.now(),
  ): Promise<number> {
    return round(calculateClaimableYield(position, now));
  }

  async claimYield(
    positionId: string,
    userAddress: `0x${string}`,
    chainId?: number,
  ): Promise<PositionTransactionResult> {
    const owner = this.requireOwner(userAddress);
    this.assertOptionalNetwork(chainId);
    const { position, ownerKey } = this.findOwnedPosition(positionId, owner);
    if (position.strategy !== "long") {
      throw new YieldDomainError(
        "position-not-found",
        "Only a Trading Yield position can claim yield.",
      );
    }
    if (position.status === "closed") {
      throw new YieldDomainError(
        "position-closed",
        "This Trading Yield position is already closed.",
      );
    }
    const claimable = await this.getClaimableYield(position);
    if (
      claimable <= 0 ||
      !canClaimYield({ ...position, claimableYield: claimable })
    ) {
      throw new YieldDomainError(
        "nothing-claimable",
        "There is no yield available to claim yet.",
      );
    }
    const now = new Date().toISOString();
    const updated: LongYieldPosition = {
      ...position,
      claimableYield: 0,
      lastClaimedAt: now,
      pnl: round(position.currentValue - position.depositedAmount),
    };
    const positions = this.positionsByOwner.get(ownerKey) ?? [];
    const index = positions.findIndex(
      (candidate) => candidate.id === positionId,
    );
    positions[index] = updated;
    this.persistPositions(ownerKey, positions);
    return { claimedAmount: claimable, txHash: MOCK_TX_HASHES.claim, chainId, status: "confirmed", timestamp: Date.now() };
  }

  async redeemFixed(
    positionId: string,
    userAddress: `0x${string}`,
    chainId?: number,
  ): Promise<PositionTransactionResult> {
    const owner = this.requireOwner(userAddress);
    this.assertOptionalNetwork(chainId);
    const { position, ownerKey } = this.findOwnedPosition(positionId, owner);
    if (position.strategy !== "fixed") {
      throw new YieldDomainError(
        "position-not-found",
        "Only a Fixed Yield position can be redeemed.",
      );
    }
    if (position.status === "redeemed") {
      throw new YieldDomainError(
        "pt-already-redeemed",
        "This PT position has already been redeemed.",
      );
    }
    if (!canRedeemFixed(position)) {
      throw new YieldDomainError(
        "pt-not-redeemable",
        "PT can only be redeemed after the market reaches maturity.",
      );
    }
    const positions = this.positionsByOwner.get(ownerKey) ?? [];
    const index = positions.findIndex(
      (candidate) => candidate.id === positionId,
    );
    positions[index] = { ...position, status: "redeemed", currentValue: 0 };
    this.persistPositions(ownerKey, positions);
    return { redeemedAmount: position.ptAmount, txHash: MOCK_TX_HASHES.redeem, chainId, status: "confirmed", timestamp: Date.now() };
  }

  async sellPosition(
    positionId: string,
    userAddress: `0x${string}`,
    chainId?: number,
    _runtime?: YieldAdapterRuntime,
    _exitQuote?: ExitQuote,
  ): Promise<PositionTransactionResult> {
    const owner = this.requireOwner(userAddress);
    this.assertOptionalNetwork(chainId);
    const { position, ownerKey } = this.findOwnedPosition(positionId, owner);
    if (!canSellPosition(position)) {
      throw new YieldDomainError(
        "position-not-sellable",
        "Only an active position can be sold before maturity.",
      );
    }
    const claimable =
      position.strategy === "long" ? position.claimableYield : 0;
    const returnedAmount = round(position.currentValue + claimable);
    const closed =
      position.strategy === "long"
        ? {
            ...position,
            status: "closed" as const,
            currentValue: 0,
            claimableYield: 0,
            pnl: round(returnedAmount - position.depositedAmount),
          }
        : {
            ...position,
            status: "closed" as const,
            currentValue: 0,
            pnl: round(returnedAmount - position.depositedAmount),
          };
    const positions = this.positionsByOwner.get(ownerKey) ?? [];
    const index = positions.findIndex(
      (candidate) => candidate.id === positionId,
    );
    positions[index] = closed;
    this.persistPositions(ownerKey, positions);
    return { returnedAmount, txHash: MOCK_TX_HASHES.sell, chainId, status: "confirmed", timestamp: Date.now() };
  }
}

export { DEMO_OWNER };
export const mockYieldAdapter = new MockYieldMarketAdapter();
export const yieldAdapter: YieldMarketAdapter =
  getConfiguredDataMode() === "live"
    ? pendleLiveYieldAdapter
    : mockYieldAdapter;
