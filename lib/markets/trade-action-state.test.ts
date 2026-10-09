import { describe, expect, it } from "bun:test";
import { getTradeActionState, type TradeActionInput } from "./trade-action-state";

const baseState: TradeActionInput = {
  strategy: "fixed",
  token: "USDG",
  isConnected: true,
  isWrongNetwork: false,
  marketStatus: "active",
  hasValidAmount: true,
  quoteState: "ready",
  isQuoteExpired: false,
  quoteRefreshRequired: false,
  tokenBalanceState: "resolved",
  isTokenBalanceInsufficient: false,
  nativeBalanceState: "resolved",
  allowanceState: "sufficient",
  transactionStep: "idle",
};

function action(overrides: Partial<TradeActionInput> = {}) {
  return getTradeActionState({ ...baseState, ...overrides });
}

describe("TradePanel CTA state", () => {
  it("keeps a ready quote preview for a manual amount when token balance is zero", () => {
    expect(action({ isTokenBalanceInsufficient: true, quoteState: "ready" })).toMatchObject({
      label: "Insufficient USDG Balance",
      disabled: true,
    });
  });

  it("requires a wallet before execution while leaving browsing and quotes available", () => {
    expect(action({ isConnected: false })).toMatchObject({ kind: "connect", label: "Connect Wallet" });
  });

  it("blocks zero-balance execution while keeping shortcuts represented as disabled state", () => {
    expect(action({ isTokenBalanceInsufficient: true, quoteState: "ready" })).toMatchObject({
      kind: "disabled",
      label: "Insufficient USDG Balance",
      disabled: true,
    });
  });

  it("does not expose an execution CTA before a quote is ready", () => {
    expect(action({ quoteState: "idle" })).toMatchObject({
      kind: "disabled",
      label: "Fetching Quote...",
      disabled: true,
    });
  });

  it("asks users to increase an amount below Pendle's minimum valuation", () => {
    expect(action({ quoteState: "minimum-amount" })).toMatchObject({
      kind: "disabled",
      label: "Increase Amount",
      disabled: true,
    });
  });

  it("shows the insufficient balance CTA for a partially funded wallet", () => {
    expect(action({ isTokenBalanceInsufficient: true }).label).toBe("Insufficient USDG Balance");
  });

  it("requires approval before opening when allowance is insufficient", () => {
    expect(action({ allowanceState: "required" })).toMatchObject({
      kind: "write",
      label: "Approve USDG",
      disabled: false,
    });
  });

  it("opens Fixed Yield when balance, gas, allowance, and quote are ready", () => {
    expect(action()).toMatchObject({ kind: "write", label: "Open Fixed Yield", disabled: false });
  });

  it("uses the same state machine for Trading Yield", () => {
    expect(action({ strategy: "long" })).toMatchObject({ kind: "write", label: "Open Trading Yield" });
  });

  it("blocks when native ETH is insufficient", () => {
    expect(action({ nativeBalanceState: "zero" })).toMatchObject({
      kind: "disabled",
      label: "Insufficient ETH for Gas",
      disabled: true,
    });
  });

  it("does not execute while quote is expired or a fresh quote is required", () => {
    expect(action({ isQuoteExpired: true })).toMatchObject({ kind: "refresh-quote", label: "Refresh Quote" });
    expect(action({ quoteRefreshRequired: true })).toMatchObject({ kind: "refresh-quote", label: "Refresh Quote" });
  });

  it("represents pending, rejected-retry, and success states safely", () => {
    expect(action({ transactionStep: "confirming" })).toMatchObject({
      kind: "disabled",
      label: "Confirming...",
      busy: true,
    });
    expect(action({ transactionStep: "success" })).toMatchObject({ kind: "success", label: "View Position" });
    expect(action({ transactionStep: "error" })).toMatchObject({ kind: "write", label: "Open Fixed Yield" });
  });
});
