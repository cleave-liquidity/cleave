import { describe, expect, it } from "bun:test";
import { MultiSourceYieldMarketAdapter } from "./multi-source-yield-market-adapter";
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
  status: "active",
  network: "mainnet",
  chainId: 4663,
  dataMode: "live",
};

const pendleStub = {
  mode: "live" as const,
  getMarkets: async () => [PENDLE_MARKET],
} as unknown as YieldMarketAdapter;

describe("MultiSourceYieldMarketAdapter", () => {
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
});
