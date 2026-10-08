import { describe, expect, it } from "bun:test";
import { getMarketSecondaryLabel, summarizeKnownLiquidity } from "./presentation";
import type { YieldMarket } from "@/types/market";

function market(overrides: Partial<YieldMarket>): YieldMarket {
  return {
    id: "market",
    symbol: "USDG",
    name: "USDG",
    description: "",
    underlyingAsset: "USDG",
    quoteAsset: "USDG",
    yieldSource: "Pendle",
    underlyingApy: 3,
    impliedApy: 4,
    maturity: "25 Mar 2027",
    maturityDate: "2027-03-25",
    maturityType: "fixed",
    daysRemaining: 100,
    liquidityUsd: 100,
    status: "active",
    network: "mainnet",
    chainId: 4663,
    dataMode: "live",
    ...overrides,
  };
}

describe("market presentation helpers", () => {
  it("sums only known liquidity and reports coverage", () => {
    expect(
      summarizeKnownLiquidity([
        market({ liquidityUsd: 100, metricAvailability: { liquidityUsd: "verified", underlyingApy: "verified", impliedApy: "verified", maturity: "verified" } }),
        market({ id: "morpho", liquidityUsd: 0, metricAvailability: { liquidityUsd: "unavailable", underlyingApy: "unavailable", impliedApy: "not-applicable", maturity: "not-applicable" } }),
        market({ id: "second", liquidityUsd: 250 }),
      ]),
    ).toEqual({ total: 350, knownMarkets: 2, totalMarkets: 3 });
  });

  it("labels repeated fixed-maturity series with real maturity metadata", () => {
    const first = market({ id: "first", maturity: "17 Sep 2026", maturityDate: "2026-09-17" });
    const second = market({ id: "second", maturity: "01 Oct 2026", maturityDate: "2026-10-01" });
    expect(getMarketSecondaryLabel(first, [first, second])).toBe("17 Sep 2026 Series");
  });

  it("keeps same-maturity series distinct with their market address", () => {
    const first = market({ id: "first", marketAddress: "0x1111111111111111111111111111111111111111" });
    const second = market({ id: "second", marketAddress: "0x2222222222222222222222222222222222222222" });
    expect(getMarketSecondaryLabel(first, [first, second])).toBe("25 Mar 2027 Series · 0x1111…1111");
  });

  it("uses the registered vault name for read-only external markets", () => {
    const morpho = market({
      symbol: "USDG",
      name: "Steakhouse USDG",
      execution: { enabled: false, providerId: "morpho" },
      yieldSourceMetadata: { name: "Steakhouse USDG" },
      maturityType: "open-ended",
      maturity: "Open-ended",
    });
    expect(getMarketSecondaryLabel(morpho, [morpho])).toBe("Steakhouse USDG");
  });
});
