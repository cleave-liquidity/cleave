import { describe, expect, it } from "bun:test";
import {
  buildTradeWorkspaceHref,
  getTradeResetState,
  isQuoteEnabledForStrategy,
  isSettledTransactionStep,
  parseTradeStrategy,
} from "./trade-strategy";

describe("trade strategy route state", () => {
  it("accepts only fixed and long strategy query values", () => {
    expect(parseTradeStrategy("fixed")).toBe("fixed");
    expect(parseTradeStrategy("long")).toBe("long");
    expect(parseTradeStrategy("invalid")).toBeUndefined();
    expect(parseTradeStrategy(undefined)).toBeUndefined();
  });

  it("does not silently choose a strategy when the route omits it", () => {
    expect(parseTradeStrategy(["invalid", "fixed"])).toBeUndefined();
    expect(parseTradeStrategy([])).toBeUndefined();
  });

  it("preserves the canonical market while changing the strategy in the URL", () => {
    const marketId = "0xc2b89e6eca583e2c232201ac557e9be58af55f4c";
    expect(buildTradeWorkspaceHref(marketId, "fixed")).toBe(
      `/trade/${marketId}?strategy=fixed`,
    );
    expect(buildTradeWorkspaceHref(marketId, "long")).toBe(
      `/trade/${marketId}?strategy=long`,
    );
  });

  it("enables only the active strategy quote", () => {
    expect(isQuoteEnabledForStrategy("fixed", "fixed")).toBe(true);
    expect(isQuoteEnabledForStrategy("fixed", "long")).toBe(false);
    expect(isQuoteEnabledForStrategy("long", "fixed")).toBe(false);
    expect(isQuoteEnabledForStrategy("long", "long")).toBe(true);
  });

  it("resets amount defaults, advanced state, and transaction state when strategy changes", () => {
    expect(getTradeResetState("fixed")).toEqual({
      inputAmount: "1000",
      showAdvanced: false,
      transactionState: { step: "idle" },
    });
    expect(getTradeResetState("long")).toEqual({
      inputAmount: "100",
      showAdvanced: false,
      transactionState: { step: "idle" },
    });
    expect(getTradeResetState("long", "250")).toEqual({
      inputAmount: "250",
      showAdvanced: false,
      transactionState: { step: "idle" },
    });
  });
});

describe("settled transaction steps", () => {
  it("lets the panel clear result states only", () => {
    expect(isSettledTransactionStep("success")).toBe(true);
    expect(isSettledTransactionStep("error")).toBe(true);
    expect(isSettledTransactionStep("approval-success")).toBe(true);
  });

  it("never clears a transaction that is still in flight", () => {
    for (const step of ["validating", "approving", "confirming", "pending"] as const) {
      expect(isSettledTransactionStep(step)).toBe(false);
    }
  });
});
