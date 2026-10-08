import { describe, expect, it } from "bun:test";
import {
  getDividendCoverage,
  getDividendMarketConfig,
  hasTradingYieldProduct,
  type DividendSourceSnapshot,
} from "./dividend-config";
import type { YieldMarket } from "@/types/market";

const STOCK_TOKEN = "0x1111111111111111111111111111111111111111" as const;
const OTHER_TOKEN = "0x2222222222222222222222222222222222222222" as const;
const MARKET_ADDRESS = "0x3333333333333333333333333333333333333333" as const;
const YT_ADDRESS = "0x4444444444444444444444444444444444444444" as const;

function market(overrides: Partial<YieldMarket> = {}): YieldMarket {
  return {
    id: MARKET_ADDRESS,
    symbol: "STOCK",
    name: "Stock Yield Market",
    description: "Test market fixture",
    underlyingAsset: "STOCK",
    quoteAsset: "USDG",
    yieldSource: "Pendle",
    providerId: "pendle",
    marketType: "pt-yt",
    execution: { enabled: true, providerId: "pendle" },
    underlyingApy: 0,
    impliedApy: 0,
    maturity: "2030-01-01",
    maturityDate: "2030-01-01",
    maturityType: "fixed",
    daysRemaining: 365,
    liquidityUsd: 0,
    status: "active",
    network: "mainnet",
    chainId: 4663,
    dataMode: "live",
    marketAddress: MARKET_ADDRESS,
    ytAddress: YT_ADDRESS,
    underlyingTokenAddress: STOCK_TOKEN,
    ...overrides,
  };
}

function snapshot(overrides: Partial<DividendSourceSnapshot> = {}): DividendSourceSnapshot {
  return {
    assets: [{
      tokenSymbol: "STOCK",
      tokenName: "Stock Token",
      status: "ASSET_STATUS_ACTIVE",
      currentMultiplier: "1",
      tokenDecimals: 18,
      tokenAddress: STOCK_TOKEN,
      chainId: 4663,
    }],
    events: [{
      eventId: "event-1",
      type: "CASH_DIVIDEND",
      status: "COMPLETED",
      tokenSymbol: "STOCK",
      underlyingSymbol: "STOCK",
      rate: "0.25",
      processDate: "2030-01-01",
      tokenAddress: STOCK_TOKEN,
      chainId: 4663,
      source: "ROBINHOOD_CORPORATE_ACTIONS",
      isSimulation: false,
    }],
    assetsVerified: true,
    eventsVerified: true,
    ...overrides,
  };
}

describe("market-driven Dividend Earn coverage", () => {
  it("resolves the source by canonical market and underlying addresses, not ticker", () => {
    const config = getDividendMarketConfig(market({ symbol: "ANY SYMBOL" }));
    expect(config).toEqual({
      marketId: MARKET_ADDRESS,
      chainId: 4663,
      tokenAddress: STOCK_TOKEN,
      source: "ROBINHOOD_CORPORATE_ACTIONS",
    });
  });

  it("reports an event as detected, not eligible, without entitlement and activation proofs", () => {
    expect(getDividendCoverage(market(), snapshot()).status).toBe("SOURCE DETECTED");
  });

  it("requires both entitlement and activation proofs before support is reported", () => {
    expect(getDividendCoverage(market(), snapshot(), {
      economicEntitlementVerified: true,
      activationInfrastructureVerified: true,
    }).status).toBe("SUPPORTED");
    expect(getDividendCoverage(market(), snapshot(), {
      economicEntitlementVerified: true,
      activationInfrastructureVerified: false,
    }).status).toBe("SOURCE DETECTED");
  });

  it("does not report a paused market as supported even when event proofs are supplied", () => {
    expect(getDividendCoverage(market({ status: "paused" }), snapshot(), {
      economicEntitlementVerified: true,
      activationInfrastructureVerified: true,
    }).status).toBe("SOURCE DETECTED");
  });

  it("does not match an event or source by symbol when the underlying address differs", () => {
    const mismatchedSnapshot = snapshot({
      events: snapshot().events.map((event) => ({ ...event, tokenAddress: OTHER_TOKEN })),
      assets: snapshot().assets.map((asset) => ({ ...asset, tokenAddress: OTHER_TOKEN })),
    });
    expect(getDividendCoverage(market(), mismatchedSnapshot).status).toBe("UNSUPPORTED");
  });

  it("keeps an active stock token with no verified event in verification pending", () => {
    expect(getDividendCoverage(market(), snapshot({ events: [] })).status).toBe("VERIFICATION PENDING");
  });

  it("does not classify a Morpho vault as a Trading Yield product or dividend eligible", () => {
    const morpho = market({
      id: "0x5555555555555555555555555555555555555555",
      symbol: "USDG",
      providerId: "morpho",
      marketType: "vault",
      execution: { enabled: false, providerId: "morpho", reason: "Read-only vault market." },
      marketAddress: "0x5555555555555555555555555555555555555555",
      ytAddress: undefined,
      underlyingTokenAddress: OTHER_TOKEN,
    });
    expect(hasTradingYieldProduct(morpho)).toBe(false);
    expect(getDividendCoverage(morpho, snapshot({ events: [], assets: [] })).status).toBe("UNSUPPORTED");
  });

  it("marks matured markets historical and blocks new Trading Yield eligibility", () => {
    expect(getDividendCoverage(market({
      status: "matured",
      maturityDate: "2020-01-01",
    }), snapshot()).status).toBe("MATURED");
  });

  it("does not report support when distribution verification is incomplete", () => {
    expect(getDividendCoverage(market(), snapshot({ eventsVerified: false })).status).toBe("VERIFICATION PENDING");
    expect(getDividendCoverage(market(), snapshot({ eventsVerified: false, events: [] })).status).toBe("VERIFICATION PENDING");
  });
});
