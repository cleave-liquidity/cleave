import { describe, expect, it } from "bun:test";
import {
  applyBalanceShortcut,
  applyManualAmount,
  type BalanceShortcutState,
} from "./balance-shortcuts";

const disconnected = {
  isConnected: false,
  isLoading: false,
  error: null,
  balance: null,
};

const connected = (balance: number) => ({
  isConnected: true,
  isLoading: false,
  error: null,
  balance,
});

const manualAmount: BalanceShortcutState = {
  inputAmount: "123.45",
  selectedShortcut: null,
};

describe("trade balance shortcuts", () => {
  it("preserves a manual amount while the wallet is disconnected", () => {
    expect(applyManualAmount(manualAmount, "123.45")).toEqual(manualAmount);
  });

  it("does not change a manual amount when a disconnected shortcut is clicked", () => {
    expect(applyBalanceShortcut(manualAmount, 0.25, disconnected)).toEqual(manualAmount);
  });

  it("does not treat an unresolved zero fallback as a usable balance", () => {
    expect(
      applyBalanceShortcut(manualAmount, 1, {
        isConnected: true,
        isLoading: true,
        error: null,
        balance: 0,
      }),
    ).toEqual(manualAmount);
  });

  it("sets 25% of a resolved wallet balance", () => {
    expect(applyBalanceShortcut(manualAmount, 0.25, connected(2_500))).toEqual({
      inputAmount: "625.00",
      selectedShortcut: 0.25,
    });
  });

  it("sets 50% of a resolved wallet balance", () => {
    expect(applyBalanceShortcut(manualAmount, 0.5, connected(2_500))).toEqual({
      inputAmount: "1250.00",
      selectedShortcut: 0.5,
    });
  });

  it("sets MAX to the resolved wallet balance", () => {
    expect(applyBalanceShortcut(manualAmount, 1, connected(2_500))).toEqual({
      inputAmount: "2500.00",
      selectedShortcut: 1,
    });
  });

  it("clears the selected shortcut when a manual amount is entered", () => {
    const selected: BalanceShortcutState = {
      inputAmount: "625.00",
      selectedShortcut: 0.25,
    };

    expect(applyManualAmount(selected, "777.25")).toEqual({
      inputAmount: "777.25",
      selectedShortcut: null,
    });
  });
});
