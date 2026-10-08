import { describe, expect, it } from "bun:test";
import {
  MultiSourceYieldMarketAdapter,
  canonicalMarketIdentity,
  normalizeMultiSourceMarkets,
  parseCanonicalMarketId,
  resolveCanonicalMarket,
} from "./multi-source-yield-market-adapter";
import type { YieldMarketAdapter } from "./types";
import type { YieldMarket } from "@/types/market";

const PENDLE_MARKET: YieldMarket = {
  id: "0xpendle-market",
  symbol: "USDG",
  name: "USDG Pendle Market",
  description: "Existing Pendle market",
  underlyingAsset: "USDG",
  quoteAsset: "USDG",
  yieldSource: "USDG",
  sourceProtocol: "Pendle",
  providerId: "pendle",
  marketType: "pt-yt",
  underlyingApy: 4,
  impliedApy: 3,
  maturity: "26 Mar 2027",
  maturityDate: "2027-03-26",
  daysRemaining: 175,
  liquidityUsd: 1_000_000,
  marketAddress: "0x1111111111111111111111111111111111111111",
  status: "active",
  network: "mainnet",
  chainId: 4663,
  dataMode: "live",
};

const pendleStub = {
  mode: "live" as const,
  getMarkets: async () => [PENDLE_MARKET],
  getMarket: async (id: string) => (id.toLowerCase() === PENDLE_MARKET.marketAddress?.toLowerCase() ? PENDLE_MARKET : null),
} as unknown as YieldMarketAdapter;

const MORPHO_MARKET: YieldMarket = {
  ...PENDLE_MARKET,
  id: "morpho:4663:0xbeeff033f34c046626b8d0a041844c5d1a5409dd",
  name: "Steakhouse USDG",
  sourceProtocol: "Morpho",
  providerId: "morpho",
  marketType: "vault",
  marketAddress: "0xBeEff033F34C046626B8D0A041844C5d1A5409dd",
  execution: { enabled: false, providerId: "morpho", reason: "Read-only" },
};

describe("MultiSourceYieldMarketAdapter", () => {
  it("parses canonical provider, chain, and market address IDs", () => {
    expect(parseCanonicalMarketId("morpho:4663:0xBeEff033F34C046626B8D0A041844C5d1A5409dd")).toEqual({
      provider: "morpho",
      chainId: 4663,
      marketAddress: "0xBeEff033F34C046626B8D0A041844C5d1A5409dd",
    });
  });

  it("resolves Pendle and Morpho rows from the same canonical normalized dataset", () => {
    const normalized = normalizeMultiSourceMarkets([PENDLE_MARKET], [MORPHO_MARKET]).markets;
    expect(resolveCanonicalMarket(normalized, canonicalMarketIdentity(PENDLE_MARKET))).toBe(PENDLE_MARKET);
    expect(resolveCanonicalMarket(normalized, canonicalMarketIdentity(MORPHO_MARKET))).toBe(MORPHO_MARKET);
  });

  it("returns no market for malformed or unknown-provider canonical IDs", () => {
    const normalized = normalizeMultiSourceMarkets([PENDLE_MARKET], [MORPHO_MARKET]).markets;
    expect(resolveCanonicalMarket(normalized, "morpho:4663:not-an-address")).toBeUndefined();
    expect(resolveCanonicalMarket(normalized, "unknown:4663:0x1111111111111111111111111111111111111111")).toBeUndefined();
  });

  it("keeps legacy Pendle address routes working", async () => {
    await expect(new MultiSourceYieldMarketAdapter(pendleStub).getMarket(PENDLE_MARKET.marketAddress!)).resolves.toBe(PENDLE_MARKET);
  });

  it("preserves existing Pendle discovery when no directory is configured", async () => {
    const adapter = new MultiSourceYieldMarketAdapter(pendleStub);
    await expect(adapter.getMarkets()).resolves.toEqual([PENDLE_MARKET]);
  });

  it("blocks execution for discovery-only providers", async () => {
    const adapter = new MultiSourceYieldMarketAdapter(pendleStub);
    await expect(adapter.getFixedQuote("morpho:4663:0xvault", 1)).rejects.toMatchObject({
      code: "unsupported-operation",
    });
  });

  it("keeps 14 Pendle markets and adds a registered Morpho market", () => {
    const pendleMarkets = Array.from({ length: 14 }, (_, index) => ({
      ...PENDLE_MARKET,
      id: `0xpendle-market-${index}`,
      marketAddress: `0x${String(index + 1).padStart(40, "0")}` as `0x${string}`,
    }));
    const snapshot = normalizeMultiSourceMarkets(pendleMarkets, [MORPHO_MARKET]);

    expect(snapshot.pendleCount).toBe(14);
    expect(snapshot.directoryCount).toBe(1);
    expect(snapshot.normalizedCount).toBe(15);
    expect(snapshot.addedMarkets).toEqual([MORPHO_MARKET]);
    expect(snapshot.markets.some((market) => market.providerId === "morpho")).toBe(true);
  });

  it("does not collapse distinct providers that share an asset", () => {
    expect(canonicalMarketIdentity(PENDLE_MARKET)).not.toBe(canonicalMarketIdentity(MORPHO_MARKET));
  });

  it("deduplicates only the same provider, chain, and market address", () => {
    const duplicate = { ...MORPHO_MARKET, id: "morpho:another-id" };
    const snapshot = normalizeMultiSourceMarkets([MORPHO_MARKET], [duplicate]);
    expect(snapshot.normalizedCount).toBe(1);
    expect(snapshot.addedMarkets).toHaveLength(0);
  });
});
