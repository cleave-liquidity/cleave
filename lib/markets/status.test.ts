import { describe, expect, it } from "bun:test";
import { getMarketStatus, getTimeToMaturity, isMarketTradable } from "./status";
import type { YieldMarket } from "@/types/market";

const now = Date.parse("2026-10-02T00:00:00.000Z");

function market(overrides: Partial<YieldMarket> = {}): YieldMarket {
  return {
    id: "test-market",
    symbol: "USDG",
    name: "Test market",
    description: "Test market",
    underlyingAsset: "USDG",
    quoteAsset: "USDG",
    yieldSource: "Test source",
    underlyingApy: 8,
    impliedApy: 7,
    maturity: "Test maturity",
    maturityDate: "2027-01-01",
    daysRemaining: 91,
    liquidityUsd: 1_000_000,
    status: "active",
    network: "testnet",
    dataMode: "mock",
    ...overrides,
  };
}

describe("market status helpers", () => {
  it("calculates time remaining from the maturity date", () => {
    expect(getTimeToMaturity("2026-10-04T00:00:00.000Z", now)).toEqual({
      milliseconds: 2 * 24 * 60 * 60 * 1000,
      days: 2,
    });
    expect(getTimeToMaturity("2026-10-01T00:00:00.000Z", now)).toEqual({
      milliseconds: 0,
      days: 0,
    });
  });

  it("derives maturing and matured states from the clock", () => {
    expect(getMarketStatus(market({ maturityDate: "2026-10-20", daysRemaining: 18 }), now)).toBe("maturing");
    expect(getMarketStatus(market({ maturityDate: "2026-10-01", daysRemaining: 1 }), now)).toBe("matured");
    expect(isMarketTradable(market({ maturityDate: "2026-10-20" }), now)).toBe(true);
    expect(isMarketTradable(market({ maturityDate: "2026-10-01" }), now)).toBe(false);
  });

  it("preserves paused as the highest-priority status", () => {
    expect(getMarketStatus(market({ status: "paused", maturityDate: "2027-01-01" }), now)).toBe("paused");
    expect(isMarketTradable(market({ status: "paused" }), now)).toBe(false);
  });
});
