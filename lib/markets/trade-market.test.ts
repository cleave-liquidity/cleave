import { describe, expect, it } from "bun:test";
import type { YieldMarket } from "@/types/market";
import { normalizeTradeMarketId, selectDefaultTradeMarket } from "./trade-market";

const market = (overrides: Partial<YieldMarket> = {}): YieldMarket => ({
  id: "0x0000000000000000000000000000000000000001",
  symbol: "USDG",
  name: "Global Dollar",
  description: "Live market",
  underlyingAsset: "USDG",
  quoteAsset: "USDG",
  yieldSource: "Global Dollar",
  underlyingApy: 3,
  impliedApy: 3,
  maturity: "01 Jan 2027",
  maturityDate: "2027-01-01",
  daysRemaining: 90,
  liquidityUsd: 10_000,
  status: "active",
  network: "mainnet",
  chainId: 4663,
  dataMode: "live",
  ...overrides,
});

describe("trade market selection", () => {
  it("accepts a bounded canonical market query and rejects unsafe input", () => {
    expect(normalizeTradeMarketId(" 0xABC ")).toBe("0xABC");
    expect(normalizeTradeMarketId(" ")).toBeUndefined();
    expect(normalizeTradeMarketId("x".repeat(129))).toBeUndefined();
  });

  it("chooses the first active market deterministically without inventing a default", () => {
    const selected = selectDefaultTradeMarket([
      market({ id: "0x0000000000000000000000000000000000000002", status: "maturing" }),
      market({ id: "0x0000000000000000000000000000000000000003", status: "active" }),
    ]);
    expect(selected?.id).toBe("0x0000000000000000000000000000000000000003");
    expect(selectDefaultTradeMarket([])).toBeNull();
  });
});
