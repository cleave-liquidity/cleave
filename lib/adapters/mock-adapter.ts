import { YieldMarket } from "@/types/market";
import { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import { FixedYieldPosition, LongYieldPosition, YieldPosition } from "@/types/position";
import { YieldMarketAdapter } from "./types";

export const MOCK_MARKETS: YieldMarket[] = [
  {
    id: "usdg-morpho-26mar27",
    symbol: "USDG",
    name: "Paxos USDG",
    description: "Yield-bearing USDG in Morpho Prime lending vault on Robinhood Chain.",
    underlyingAsset: "USDG",
    quoteAsset: "USDG",
    yieldSource: "Morpho lending vault",
    sourceProtocol: "Morpho",
    underlyingApy: 7.10,
    impliedApy: 6.42,
    maturity: "26 Mar 2027",
    maturityDate: "2027-03-26",
    daysRemaining: 175,
    liquidityUsd: 4_200_000,
    status: "active",
    ptAddress: "0x4A6bA031F1C18D3b5b154a01f5F75e5bA2E9F101",
    ytAddress: "0x89e2C3b7C20E1552a4eE4195155f3089454170B2",
    vaultAddress: "0x1234567890abcdef1234567890abcdef12345678",
  },
  {
    id: "susde-ethena-24jun27",
    symbol: "sUSDe",
    name: "Staked USDe",
    description: "Synthetic dollar yield from delta-neutral basis trading on Ethena.",
    underlyingAsset: "sUSDe",
    quoteAsset: "USDG",
    yieldSource: "Ethena staking",
    sourceProtocol: "Ethena",
    underlyingApy: 9.85,
    impliedApy: 8.90,
    maturity: "24 Jun 2027",
    maturityDate: "2027-06-24",
    daysRemaining: 265,
    liquidityUsd: 2_700_000,
    status: "active",
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
    underlyingApy: 5.40,
    impliedApy: 5.95,
    maturity: "17 Dec 2026",
    maturityDate: "2026-12-17",
    daysRemaining: 76,
    liquidityUsd: 900_000,
    status: "maturing",
    ptAddress: "0x6331a980F8D26Fe95f87b89710313f89012a9122",
    ytAddress: "0x51B0D8b813735749A3212879058b87192A02842B",
    vaultAddress: "0x3456789012abcdef3456789012abcdef34567890",
  },
  {
    id: "wsteth-lido-30sep27",
    symbol: "wstETH",
    name: "Wrapped Staked ETH",
    description: "Liquid staking yield from Ethereum proof-of-stake consensus rewards.",
    underlyingAsset: "wstETH",
    quoteAsset: "ETH",
    yieldSource: "Lido staking",
    sourceProtocol: "Lido",
    underlyingApy: 3.45,
    impliedApy: 3.20,
    maturity: "30 Sep 2027",
    maturityDate: "2027-09-30",
    daysRemaining: 363,
    liquidityUsd: 6_100_000,
    status: "active",
    ptAddress: "0x77c4424A9F2e652aF3e390b14421b92040E0F921",
    ytAddress: "0x2A19011e4C46B124219451996919011bE5bA2E9F",
    vaultAddress: "0x4567890123abcdef4567890123abcdef45678901",
  },
];

export const INITIAL_POSITIONS: YieldPosition[] = [
  {
    id: "pos-fixed-1",
    marketId: "usdg-morpho-26mar27",
    assetSymbol: "USDG",
    strategy: "fixed",
    depositedAmount: 1000.0,
    ptAmount: 1030.08,
    currentValue: 1009.56,
    pnl: 9.56,
    quotedFixedApy: 6.38,
    maturity: "26 Mar 2027",
    maturityDate: "2027-03-26",
    openedAt: "02 Oct 2026",
    status: "active",
  },
  {
    id: "pos-long-1",
    marketId: "usdg-morpho-26mar27",
    assetSymbol: "USDG",
    strategy: "long",
    depositedAmount: 100.0,
    ytAmount: 3402.0,
    currentValue: 67.74,
    pnl: 4.37, // total PnL including claimable
    claimableYield: 36.63,
    underlyingApyAtOpen: 7.10,
    impliedApyAtOpen: 6.42,
    currentUnderlyingApy: 7.10,
    maturity: "26 Mar 2027",
    maturityDate: "2027-03-26",
    openedAt: "02 Oct 2026",
    status: "active",
  },
];

export class MockYieldMarketAdapter implements YieldMarketAdapter {
  private markets: YieldMarket[] = [...MOCK_MARKETS];
  private positions: YieldPosition[] = [...INITIAL_POSITIONS];

  async getMarkets(): Promise<YieldMarket[]> {
    return Promise.resolve(this.markets);
  }

  async getMarket(id: string): Promise<YieldMarket | null> {
    const market = this.markets.find((m) => m.id === id) || null;
    return Promise.resolve(market);
  }

  async getPositions(_userAddress?: string): Promise<YieldPosition[]> {
    return Promise.resolve(this.positions);
  }

  async getFixedQuote(marketId: string, inputAmount: number): Promise<FixedYieldQuote> {
    const market = this.markets.find((m) => m.id === marketId) || this.markets[0];
    const days = market.daysRemaining;
    const yearFraction = days / 365;

    // Price impact scales slightly with input amount relative to liquidity
    const priceImpact = Math.min(0.005, (inputAmount / market.liquidityUsd) * 0.05);
    const effectiveImpliedApy = market.impliedApy * (1 - priceImpact * 0.1);

    // PT price discount formula: 1 / (1 + APY * t)
    const ptPrice = 1 / (1 + (effectiveImpliedApy / 100) * yearFraction);
    const ptReceived = inputAmount / ptPrice;
    const quotedFixedApy = ((ptReceived / inputAmount - 1) / yearFraction) * 100;
    const estimatedMaturityValue = ptReceived;

    return Promise.resolve({
      inputAmount,
      ptReceived,
      quotedFixedApy: Number(quotedFixedApy.toFixed(2)),
      priceImpact: Number((priceImpact * 100).toFixed(2)),
      estimatedMaturityValue: Number(estimatedMaturityValue.toFixed(2)),
      ptPrice: Number(ptPrice.toFixed(4)),
      daysToMaturity: days,
    });
  }

  async getLongQuote(marketId: string, inputAmount: number): Promise<LongYieldQuote> {
    const market = this.markets.find((m) => m.id === marketId) || this.markets[0];
    const days = market.daysRemaining;
    const yearFraction = days / 365;

    const priceImpact = Math.min(0.008, (inputAmount / market.liquidityUsd) * 0.08);

    // YT price is roughly the present value of expected yield:
    // ytPrice = 1 - ptPrice
    const ptPrice = 1 / (1 + (market.impliedApy / 100) * yearFraction);
    const ytPrice = Math.max(0.015, 1 - ptPrice);

    const ytReceived = inputAmount / ytPrice;
    const estimatedYieldExposure = ytReceived; // Notional exposure
    const estimatedBreakEvenApy = Number((market.impliedApy * 0.97).toFixed(2));

    // Calculate sample scenarios based on rate behavior
    const rateNowReturn = (ytReceived * (market.underlyingApy / 100) * yearFraction);
    const rateFallReturn = (ytReceived * (5.0 / 100) * yearFraction);
    const rateRiseReturn = (ytReceived * (8.5 / 100) * yearFraction);

    return Promise.resolve({
      inputAmount,
      ytReceived: Number(ytReceived.toFixed(2)),
      underlyingApy: market.underlyingApy,
      impliedApy: market.impliedApy,
      estimatedBreakEvenApy,
      priceImpact: Number((priceImpact * 100).toFixed(2)),
      estimatedYieldExposure: Number(estimatedYieldExposure.toFixed(0)),
      ytPrice: Number(ytPrice.toFixed(4)),
      daysToMaturity: days,
      estimatedReturns: {
        currentRate: {
          apy: market.underlyingApy,
          returnAmount: Number(rateNowReturn.toFixed(2)),
          percentChange: Number((((rateNowReturn - inputAmount) / inputAmount) * 100).toFixed(1)),
        },
        lowerRate: {
          apy: 5.0,
          returnAmount: Number(rateFallReturn.toFixed(2)),
          percentChange: Number((((rateFallReturn - inputAmount) / inputAmount) * 100).toFixed(1)),
        },
        higherRate: {
          apy: 8.5,
          returnAmount: Number(rateRiseReturn.toFixed(2)),
          percentChange: Number((((rateRiseReturn - inputAmount) / inputAmount) * 100).toFixed(1)),
        },
      },
    });
  }

  async openFixedPosition(
    marketId: string,
    inputAmount: number,
    _userAddress?: string
  ): Promise<FixedYieldPosition> {
    const quote = await this.getFixedQuote(marketId, inputAmount);
    const market = (await this.getMarket(marketId))!;

    const newPosition: FixedYieldPosition = {
      id: `pos-fixed-${Date.now()}`,
      marketId,
      assetSymbol: market.symbol,
      strategy: "fixed",
      depositedAmount: inputAmount,
      ptAmount: quote.ptReceived,
      currentValue: inputAmount,
      pnl: 0,
      quotedFixedApy: quote.quotedFixedApy,
      maturity: market.maturity,
      maturityDate: market.maturityDate,
      openedAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: "active",
    };

    this.positions.unshift(newPosition);
    return newPosition;
  }

  async openLongPosition(
    marketId: string,
    inputAmount: number,
    _userAddress?: string
  ): Promise<LongYieldPosition> {
    const quote = await this.getLongQuote(marketId, inputAmount);
    const market = (await this.getMarket(marketId))!;

    const newPosition: LongYieldPosition = {
      id: `pos-long-${Date.now()}`,
      marketId,
      assetSymbol: market.symbol,
      strategy: "long",
      depositedAmount: inputAmount,
      ytAmount: quote.ytReceived,
      currentValue: inputAmount,
      pnl: 0,
      claimableYield: 0,
      underlyingApyAtOpen: market.underlyingApy,
      impliedApyAtOpen: market.impliedApy,
      currentUnderlyingApy: market.underlyingApy,
      maturity: market.maturity,
      maturityDate: market.maturityDate,
      openedAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: "active",
    };

    this.positions.unshift(newPosition);
    return newPosition;
  }

  async claimYield(
    positionId: string
  ): Promise<{ claimedAmount: number; txHash: `0x${string}` }> {
    const pos = this.positions.find((p) => p.id === positionId && p.strategy === "long") as
      | LongYieldPosition
      | undefined;
    if (!pos) throw new Error("Long position not found");
    const claimed = pos.claimableYield;
    pos.claimableYield = 0;
    return {
      claimedAmount: claimed,
      txHash: "0x892a0129bcfe345239a9c1e18d3b5b154a01f5f75e5ba2e9f101123456789abc",
    };
  }

  async redeemFixed(
    positionId: string
  ): Promise<{ redeemedAmount: number; txHash: `0x${string}` }> {
    const pos = this.positions.find((p) => p.id === positionId && p.strategy === "fixed") as
      | FixedYieldPosition
      | undefined;
    if (!pos) throw new Error("Fixed position not found");
    pos.status = "redeemed";
    return {
      redeemedAmount: pos.ptAmount,
      txHash: "0x5b154a01f5f75e5ba2e9f101892a0129bcfe345239a9c1e18d3123456789abc",
    };
  }

  async sellPosition(
    positionId: string
  ): Promise<{ returnedAmount: number; txHash: `0x${string}` }> {
    const index = this.positions.findIndex((p) => p.id === positionId);
    if (index === -1) throw new Error("Position not found");
    const pos = this.positions[index];
    const returnedAmount = pos.currentValue;
    this.positions.splice(index, 1);
    return {
      returnedAmount,
      txHash: "0x1e18d3b5b154a01f5f75e5ba2e9f101892a0129bcfe345239a9c123456789abc",
    };
  }
}

export const yieldAdapter = new MockYieldMarketAdapter();
