import { YieldDomainError } from "@/types/errors";
import { YieldMarket } from "@/types/market";
import { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
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
import { PositionTransactionResult, YieldMarketAdapter } from "./types";

const STORAGE_PREFIX = "cleave:mock-positions:v1:";
const QUOTE_TTL_MS = 30_000;
const MOCK_INITIAL_CLAIMABLE_YIELD_RATE = 0.01;
const DEMO_OWNER =
  "0x000000000000000000000000000000000000dEaD" as `0x${string}`;

const MOCK_TX_HASHES = {
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

function isPositionRecord(value: unknown): value is YieldPosition {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<YieldPosition>;
  const commonValid =
    typeof candidate.id === "string" &&
    typeof candidate.owner === "string" &&
    typeof candidate.marketId === "string" &&
    (candidate.strategy === "fixed" || candidate.strategy === "long") &&
    typeof candidate.maturityDate === "string" &&
    typeof candidate.openedAt === "string" &&
    typeof candidate.mockTxHash === "string" &&
    ["active", "matured", "closed", "redeemed"].includes(
      candidate.status as string,
    ) &&
    typeof candidate.depositedAmount === "number" &&
    typeof candidate.currentValue === "number" &&
    typeof candidate.pnl === "number";
  if (!commonValid) return false;
  if (candidate.strategy === "fixed") {
    const fixed = candidate as Partial<FixedYieldPosition>;
    return (
      typeof fixed.ptAmount === "number" &&
      typeof fixed.entryImpliedApy === "number" &&
      typeof fixed.quotedFixedApy === "number"
    );
  }
  if (candidate.strategy === "long") {
    const long = candidate as Partial<LongYieldPosition>;
    return (
      typeof long.ytAmount === "number" &&
      typeof long.claimableYield === "number" &&
      typeof long.entryUnderlyingApy === "number" &&
      typeof long.entryImpliedApy === "number" &&
      typeof long.breakEvenApy === "number" &&
      typeof long.currentUnderlyingApy === "number" &&
      typeof long.lastClaimedAt === "string"
    );
  }
  return false;
}

export const MOCK_MARKETS: YieldMarket[] = [
  {
    id: "usdg-morpho-26mar27",
    symbol: "USDG",
    name: "Paxos USDG",
    description:
      "Yield-bearing USDG in Morpho Prime lending vault on Robinhood Chain.",
    underlyingAsset: "USDG",
    quoteAsset: "USDG",
    yieldSource: "Morpho lending vault",
    sourceProtocol: "Morpho",
    assetMetadata: { symbol: "USDG", name: "Paxos USDG" },
    protocolMetadata: { name: "Morpho" },
    underlyingApy: 7.1,
    impliedApy: 6.42,
    maturity: "26 Mar 2027",
    maturityDate: "2027-03-26",
    daysRemaining: 175,
    liquidityUsd: 4_200_000,
    status: "active",
    network: "testnet",
    dataMode: "mock",
    ptAddress: "0x4A6bA031F1C18D3b5b154a01f5F75e5bA2E9F101",
    ytAddress: "0x89e2C3b7C20E1552a4eE4195155f3089454170B2",
    vaultAddress: "0x1234567890abcdef1234567890abcdef12345678",
  },
  {
    id: "susde-ethena-24jun27",
    symbol: "sUSDe",
    name: "Staked USDe",
    description:
      "Synthetic dollar yield from delta-neutral basis trading on Ethena.",
    underlyingAsset: "sUSDe",
    quoteAsset: "USDG",
    yieldSource: "Ethena staking",
    sourceProtocol: "Ethena",
    assetMetadata: { symbol: "sUSDe", name: "Staked USDe" },
    protocolMetadata: { name: "Ethena" },
    underlyingApy: 9.85,
    impliedApy: 8.9,
    maturity: "24 Jun 2027",
    maturityDate: "2027-06-24",
    daysRemaining: 265,
    liquidityUsd: 2_700_000,
    status: "active",
    network: "testnet",
    dataMode: "mock",
    ptAddress: "0x91F4e11C313C5237C5046e3d2319451996919011",
    ytAddress: "0x19932148dce54e56592B6fD304D13A4996929944",
    vaultAddress: "0x2345678901abcdef2345678901abcdef23456789",
  },
  {
    id: "snet-netnet-17dec26",
    symbol: "sNET",
    name: "Staked NET",
    description: "Native gas token staking yield on NetNet validator pool.",
    underlyingAsset: "sNET",
    quoteAsset: "NET",
    yieldSource: "NetNet staking",
    sourceProtocol: "NetNet",
    assetMetadata: { symbol: "sNET", name: "Staked NET" },
    protocolMetadata: { name: "NetNet" },
    underlyingApy: 5.4,
    impliedApy: 5.95,
    maturity: "17 Dec 2026",
    maturityDate: "2026-12-17",
    daysRemaining: 76,
    liquidityUsd: 900_000,
    status: "maturing",
    network: "testnet",
    dataMode: "mock",
    ptAddress: "0x6331a980F8D26Fe95f87b89710313f89012a9122",
    ytAddress: "0x51B0D8b813735749A3212879058b87192A02842B",
    vaultAddress: "0x3456789012abcdef3456789012abcdef34567890",
  },
  {
    id: "wsteth-lido-30sep27",
    symbol: "wstETH",
    name: "Wrapped Staked ETH",
    description:
      "Liquid staking yield from Ethereum proof-of-stake consensus rewards.",
    underlyingAsset: "wstETH",
    quoteAsset: "ETH",
    yieldSource: "Lido staking",
    sourceProtocol: "Lido",
    assetMetadata: { symbol: "wstETH", name: "Wrapped Staked ETH" },
    protocolMetadata: { name: "Lido" },
    underlyingApy: 3.45,
    impliedApy: 3.2,
    maturity: "30 Sep 2027",
    maturityDate: "2027-09-30",
    daysRemaining: 363,
    liquidityUsd: 6_100_000,
    status: "active",
    network: "testnet",
    dataMode: "mock",
    ptAddress: "0x77c4424A9F2e652aF3e390b14421b92040E0F921",
    ytAddress: "0x2A19011e4C46B124219451996919011bE5bA2E9F",
    vaultAddress: "0x4567890123abcdef4567890123abcdef45678901",
  },
];

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
      if (!Array.isArray(parsed) || !parsed.every(isPositionRecord)) {
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

  async getPositions(userAddress?: `0x${string}`): Promise<YieldPosition[]> {
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
  ): Promise<PositionTransactionResult> {
    const owner = this.requireOwner(userAddress);
    const { position, ownerKey } = this.findOwnedPosition(positionId, owner);
    if (position.strategy !== "long") {
      throw new YieldDomainError(
        "position-not-found",
        "Only a Long Yield position can claim yield.",
      );
    }
    if (position.status === "closed") {
      throw new YieldDomainError(
        "position-closed",
        "This Long Yield position is already closed.",
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
    return { claimedAmount: claimable, txHash: MOCK_TX_HASHES.claim };
  }

  async redeemFixed(
    positionId: string,
    userAddress: `0x${string}`,
  ): Promise<PositionTransactionResult> {
    const owner = this.requireOwner(userAddress);
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
    return { redeemedAmount: position.ptAmount, txHash: MOCK_TX_HASHES.redeem };
  }

  async sellPosition(
    positionId: string,
    userAddress: `0x${string}`,
  ): Promise<PositionTransactionResult> {
    const owner = this.requireOwner(userAddress);
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
    return { returnedAmount, txHash: MOCK_TX_HASHES.sell };
  }
}

export { DEMO_OWNER };
export const yieldAdapter = new MockYieldMarketAdapter();
