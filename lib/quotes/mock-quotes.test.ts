import { describe, expect, it } from "bun:test";
import { calculateFixedQuote, calculateLongQuote } from "./mock-quotes";
import { MOCK_MARKETS } from "@/lib/adapters/mock-adapter";

describe("mock quote engine", () => {
  it("returns fixed-yield metadata and a future expiration", () => {
    const quote = calculateFixedQuote(MOCK_MARKETS[0], 100);

    expect(quote.marketId).toBe(MOCK_MARKETS[0].id);
    expect(quote.quoteId).toContain("mock-fixed-");
    expect(quote.inputAmount).toBe(100);
    expect(quote.ptReceived).toBeGreaterThan(100);
    expect(quote.estimatedMaturityValue).toBeCloseTo(quote.ptReceived, 2);
    expect(quote.networkFeeEstimate).toBeGreaterThan(0);
    expect(quote.quoteExpiry).toBeGreaterThan(quote.quoteTimestamp);
    expect(quote.daysToMaturity).toBe(MOCK_MARKETS[0].daysRemaining);
  });

  it("returns long-yield exposure and scenario returns", () => {
    const quote = calculateLongQuote(MOCK_MARKETS[1], 100);

    expect(quote.marketId).toBe(MOCK_MARKETS[1].id);
    expect(quote.quoteId).toContain("mock-long-");
    expect(quote.ytReceived).toBeGreaterThan(0);
    expect(quote.estimatedYieldExposure).toBeCloseTo(quote.ytReceived, 2);
    expect(quote.estimatedBreakEvenApy).toBeGreaterThan(0);
    expect(quote.estimatedReturns.currentRate.returnAmount).toBeGreaterThan(0);
    expect(quote.estimatedReturns.lowerRate.apy).toBeLessThanOrEqual(quote.estimatedReturns.higherRate.apy);
    expect(quote.quoteExpiry).toBeGreaterThan(quote.quoteTimestamp);
  });
});
