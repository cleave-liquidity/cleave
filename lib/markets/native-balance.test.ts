import { describe, expect, it } from "bun:test";
import { isSupportedRobinhoodChain } from "@/lib/web3/chains";
import { isQuoteEnabledForStrategy } from "./trade-strategy";
import {
  blocksExecutionForNativeBalance,
  getNativeBalanceStatus,
  type NativeBalanceInput,
} from "./native-balance";

const connected = (overrides: Partial<NativeBalanceInput> = {}): NativeBalanceInput => ({
  isConnected: true,
  isLoading: false,
  balance: 0,
  hasBalance: true,
  ...overrides,
});

describe("native ETH balance preflight", () => {
  it("keeps a disconnected wallet separate from a zero resolved balance", () => {
    expect(getNativeBalanceStatus({
      isConnected: false,
      isLoading: false,
      balance: null,
      hasBalance: false,
    })).toBe("disconnected");
    expect(getNativeBalanceStatus(connected())).toBe("resolved");
    expect(blocksExecutionForNativeBalance(connected())).toBe(true);
  });

  it("does not treat a loading native balance as zero", () => {
    const state = connected({ balance: null, hasBalance: false, isLoading: true });

    expect(getNativeBalanceStatus(state)).toBe("loading");
    expect(blocksExecutionForNativeBalance(state)).toBe(true);
  });

  it("blocks execution when the native balance is unavailable", () => {
    const state = connected({ balance: null, hasBalance: false, error: new Error("RPC unavailable") });

    expect(getNativeBalanceStatus(state)).toBe("unavailable");
    expect(blocksExecutionForNativeBalance(state)).toBe(true);
  });

  it("blocks approval and trade execution when native ETH is zero", () => {
    const state = connected({ balance: 0 });

    expect(getNativeBalanceStatus(state)).toBe("resolved");
    expect(blocksExecutionForNativeBalance(state)).toBe(true);
  });

  it("allows the existing write flow when native ETH is positive", () => {
    const state = connected({ balance: 0.0042 });

    expect(getNativeBalanceStatus(state)).toBe("resolved");
    expect(blocksExecutionForNativeBalance(state)).toBe(false);
  });

  it("keeps token balance and gas balance independent", () => {
    const tokenBalance = 12.4;
    const zeroGas = connected({ balance: 0 });
    const fundedGas = connected({ balance: 0.0042 });

    expect(tokenBalance).toBeGreaterThan(0);
    expect(blocksExecutionForNativeBalance(zeroGas)).toBe(true);
    expect(blocksExecutionForNativeBalance(fundedGas)).toBe(false);
  });

  it("does not use native gas state to disable quote preview", () => {
    expect(isQuoteEnabledForStrategy("fixed", "fixed")).toBe(true);
    expect(isQuoteEnabledForStrategy("long", "long")).toBe(true);
    expect(blocksExecutionForNativeBalance(connected({ balance: 0 }))).toBe(true);
  });

  it("leaves wrong-network blocking to the existing network guard", () => {
    expect(isSupportedRobinhoodChain(1)).toBe(false);
    expect(isSupportedRobinhoodChain(4663)).toBe(true);
    expect(blocksExecutionForNativeBalance(connected({ balance: 0.0042 }))).toBe(false);
  });
});
