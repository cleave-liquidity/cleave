import { describe, expect, it } from "bun:test";
import type { YieldMarket } from "@/types/market";
import { marketHref, pickFeaturedMarket } from "./featuredMarket";

function market(overrides: Partial<YieldMarket> = {}): YieldMarket {
  return {
    id: "0x0000000000000000000000000000000000000001",
    symbol: "PFE",
    name: "Pfizer",
    description: "Test market",
    underlyingAsset: "PFE",
    quoteAsset: "USDG",
    yieldSource: "Lending vault",
    underlyingApy: 5,
    impliedApy: 4,
    maturity: "26 Mar 2027",
    maturityDate: "2027-03-26",
    daysRemaining: 100,
    liquidityUsd: 10_000,
    status: "active",
    network: "mainnet",
    chainId: 4663,
    dataMode: "live",
    ...overrides,
  };
}

describe("landing market links", () => {
  it("opens the shared trade workspace with the canonical market ID", () => {
    expect(
      marketHref("0xc2b89e6eca583e2c232201ac557e9be58af55f4c", "fixed", 100),
    ).toBe("/trade/0xc2b89e6eca583e2c232201ac557e9be58af55f4c?strategy=fixed&amount=100");
  });

  it("prefers a valid Global Dollar market regardless of adapter order", () => {
    const pfe = market({ id: "0xpfe", liquidityUsd: 900_000 });
    const usdg = market({
      id: "0xusdg",
      symbol: "USDG",
      name: "Global Dollar",
      liquidityUsd: 50_000,
    });

    expect(pickFeaturedMarket([pfe, usdg])?.id).toBe("0xusdg");
    expect(pickFeaturedMarket([usdg, pfe])?.id).toBe("0xusdg");
  });

  it("uses liquidity and market ID as deterministic fallback tie-breakers", () => {
    const lowerId = market({ id: "0xaaa", liquidityUsd: 100_000 });
    const higherId = market({ id: "0xbbb", liquidityUsd: 100_000 });

    expect(pickFeaturedMarket([higherId, lowerId])?.id).toBe("0xaaa");
    expect(pickFeaturedMarket([lowerId, higherId])?.id).toBe("0xaaa");
  });
});
