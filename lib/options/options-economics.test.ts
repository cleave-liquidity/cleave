import { describe, expect, test } from "bun:test";
import {
  getOptionsBreakevenRate,
  getOptionsTestnetStrikeLadder,
  OPTIONS_RATE_SCALE,
  OPTIONS_TESTNET_TENOR_SECONDS,
  optionsExpiryFrom,
} from "./options-economics";

describe("Yield Rate Options development terms", () => {
  test("uses one fixed 30-day expiry", () => {
    expect(optionsExpiryFrom(1_000n) - 1_000n).toBe(30n * 24n * 60n * 60n);
    expect(OPTIONS_TESTNET_TENOR_SECONDS).toBe(2_592_000n);
  });

  test("offers only three half-point-grid strikes around the rate", () => {
    expect(getOptionsTestnetStrikeLadder(50_000_000_000_000_000n)).toEqual([
      40_000_000_000_000_000n,
      50_000_000_000_000_000n,
      60_000_000_000_000_000n,
    ]);
  });

  test("clips strike choices to the supported 0–100% rate range", () => {
    expect(getOptionsTestnetStrikeLadder(0n)).toEqual([0n, 10_000_000_000_000_000n]);
    expect(getOptionsTestnetStrikeLadder(OPTIONS_RATE_SCALE)).toEqual([
      990_000_000_000_000_000n,
      OPTIONS_RATE_SCALE,
    ]);
  });

  test("calculates call and put breakeven with conservative rounding", () => {
    const notional = 1_000_000n;
    const premium = 10_000n;
    const strike = 50_000_000_000_000_000n;
    expect(getOptionsBreakevenRate("CALL", strike, premium, notional)).toBe(
      60_000_000_000_000_000n,
    );
    expect(getOptionsBreakevenRate("PUT", strike, premium, notional)).toBe(
      40_000_000_000_000_000n,
    );
  });

  test("returns no breakeven outside the bounded rate domain", () => {
    expect(getOptionsBreakevenRate("CALL", OPTIONS_RATE_SCALE, 1n, 1n)).toBeUndefined();
    expect(getOptionsBreakevenRate("PUT", 0n, 1n, 1n)).toBeUndefined();
    expect(getOptionsBreakevenRate("CALL", 0n, 1n, 0n)).toBeUndefined();
  });
});
