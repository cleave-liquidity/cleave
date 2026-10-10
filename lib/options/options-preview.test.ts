import { describe, expect, test } from "bun:test";
import {
  OPTIONS_DEVELOPMENT_PREVIEW_RATE,
  calculateOptionsDevelopmentPreview,
  calculateOptionsScenarioPayout,
} from "./options-preview";

describe("Yield Rate Options development preview", () => {
  test("offers a deterministic 5% reference and exact ATM CALL economics", () => {
    const preview = calculateOptionsDevelopmentPreview({
      kind: "CALL",
      strike: 50_000_000_000_000_000n,
      notional: 100_000_000n,
      nowSeconds: 1_000n,
    });

    expect(OPTIONS_DEVELOPMENT_PREVIEW_RATE).toBe(50_000_000_000_000_000n);
    expect(preview).toMatchObject({
      currentRate: 50_000_000_000_000_000n,
      premium: 1_000_000n,
      maxPayout: 100_000_000n,
      breakevenRate: 60_000_000_000_000_000n,
      settlementScenarioRate: 60_000_000_000_000_000n,
      settlementScenarioPayout: 1_000_000n,
      expiry: 2_593_000n,
    });
  });

  test("updates PUT breakeven and illustrative payoff independently of CALL", () => {
    const preview = calculateOptionsDevelopmentPreview({
      kind: "PUT",
      strike: 50_000_000_000_000_000n,
      notional: 100_000_000n,
      nowSeconds: 1_000n,
    });

    expect(preview).toMatchObject({
      premium: 1_000_000n,
      breakevenRate: 40_000_000_000_000_000n,
      settlementScenarioRate: 40_000_000_000_000_000n,
      settlementScenarioPayout: 1_000_000n,
    });
  });

  test("changes premium with strike distance and notional", () => {
    const preview = calculateOptionsDevelopmentPreview({
      kind: "CALL",
      strike: 40_000_000_000_000_000n,
      notional: 250_000_000n,
      nowSeconds: 0n,
    });

    // 1% base premium + 25% of the 1%-of-notional rate distance.
    expect(preview.premium).toBe(3_125_000n);
    expect(preview.maxPayout).toBe(250_000_000n);
  });

  test("rejects invalid strikes and nonpositive notionals", () => {
    expect(() => calculateOptionsDevelopmentPreview({
      kind: "CALL",
      strike: 100_000_000_000_000_000_1n,
      notional: 1n,
      nowSeconds: 1n,
    })).toThrow();
    expect(() => calculateOptionsDevelopmentPreview({
      kind: "PUT",
      strike: 0n,
      notional: 0n,
      nowSeconds: 1n,
    })).toThrow();
  });

  test("computes gross CALL and PUT payoff on the correct side of strike", () => {
    const strike = 50_000_000_000_000_000n;
    const notional = 100_000_000n;
    expect(calculateOptionsScenarioPayout("CALL", strike, notional, 40_000_000_000_000_000n)).toBe(0n);
    expect(calculateOptionsScenarioPayout("CALL", strike, notional, 60_000_000_000_000_000n)).toBe(1_000_000n);
    expect(calculateOptionsScenarioPayout("PUT", strike, notional, 40_000_000_000_000_000n)).toBe(1_000_000n);
    expect(calculateOptionsScenarioPayout("PUT", strike, notional, 60_000_000_000_000_000n)).toBe(0n);
  });
});
