import { describe, expect, it } from "bun:test";
import {
  getQuoteTechnicalMessage,
  getQuoteUiState,
  getQuoteUserMessage,
  isQuoteExecutionReady,
  QUOTE_UNAVAILABLE_MESSAGE,
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

  it("does not treat an expired quote as executable", () => {
    expect(getQuoteUiState({ hasValidAmount: true, isLoading: false, quote: { quoteId: "quote-1" }, isExpired: true })).toBe("error");
    expect(isQuoteExecutionReady("ready")).toBe(true);
    expect(isQuoteExecutionReady("idle")).toBe(false);
    expect(isQuoteExecutionReady("quoting")).toBe(false);
    expect(isQuoteExecutionReady("unavailable")).toBe(false);
    expect(isQuoteExecutionReady("error")).toBe(false);
  });
});
