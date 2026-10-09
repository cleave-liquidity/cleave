import { describe, expect, it } from "bun:test";
import {
  getQuoteTechnicalMessage,
  getQuoteUiState,
  getQuoteUserMessage,
  isQuoteExecutionReady,
  QUOTE_UNAVAILABLE_MESSAGE,
  QUOTE_MINIMUM_AMOUNT_MESSAGE,
  QUOTE_RATE_LIMITED_MESSAGE,
  QUOTE_SERVICE_UNAVAILABLE_MESSAGE,
  isQuoteMinimumAmountError,
} from "./quote-state";

describe("trade quote UI state", () => {
  it("moves from idle to quoting to ready for a valid amount", () => {
    expect(getQuoteUiState({ hasValidAmount: false, isLoading: false, quote: null })).toBe("idle");
    expect(getQuoteUiState({ hasValidAmount: true, isLoading: true, quote: null })).toBe("quoting");
    expect(getQuoteUiState({ hasValidAmount: true, isLoading: false, quote: { quoteId: "quote-1" } })).toBe("ready");
  });

  it("separates no-route responses from unexpected quote errors", () => {
    const noRoute = new Error("Multi-routing: No routes available");
    const unexpected = new Error("RPC request timed out");

    expect(getQuoteUiState({ hasValidAmount: true, isLoading: false, quote: null, error: noRoute })).toBe("unavailable");
    expect(getQuoteUiState({ hasValidAmount: true, isLoading: false, quote: null, error: unexpected })).toBe("error");
    expect(getQuoteUserMessage(noRoute)).toBe(QUOTE_UNAVAILABLE_MESSAGE);
    expect(getQuoteUserMessage(noRoute)).not.toContain("Multi-routing");
    expect(getQuoteUserMessage(unexpected)).not.toContain("RPC request timed out");
    expect(getQuoteTechnicalMessage(noRoute)).toContain("Multi-routing");
  });

  it("classifies unsupported routes, minimum amounts, rate limits, and provider failures", () => {
    expect(getQuoteUiState({ hasValidAmount: true, isLoading: false, quote: null, error: new Error("Pendle API HTTP 400: This token cannot be swapped") })).toBe("unavailable");
    expect(getQuoteUserMessage(new Error("Pendle API HTTP 400: This token cannot be swapped"))).toBe(QUOTE_UNAVAILABLE_MESSAGE);
    const minimumError = new Error("Pendle API HTTP 400: The input valuation is too low. The minimum valuation is 0.01 USD");
    expect(isQuoteMinimumAmountError(minimumError)).toBe(true);
    expect(getQuoteUiState({ hasValidAmount: true, isLoading: false, quote: null, error: minimumError })).toBe("minimum-amount");
    expect(getQuoteUserMessage(minimumError)).toBe(QUOTE_MINIMUM_AMOUNT_MESSAGE);
    expect(getQuoteUserMessage(new Error("Pendle API HTTP 429: rate limit"))).toBe(QUOTE_RATE_LIMITED_MESSAGE);
    expect(getQuoteUserMessage(new Error("Pendle API HTTP 503: unavailable"))).toBe(QUOTE_SERVICE_UNAVAILABLE_MESSAGE);
  });

  it("does not treat an expired quote as executable", () => {
    expect(getQuoteUiState({ hasValidAmount: true, isLoading: false, quote: { quoteId: "quote-1" }, isExpired: true })).toBe("error");
    expect(isQuoteExecutionReady("ready")).toBe(true);
    expect(isQuoteExecutionReady("idle")).toBe(false);
    expect(isQuoteExecutionReady("quoting")).toBe(false);
    expect(isQuoteExecutionReady("unavailable")).toBe(false);
    expect(isQuoteExecutionReady("error")).toBe(false);
  });
});
