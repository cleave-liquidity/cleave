import { describe, expect, test } from "bun:test";
import { OPTIONS_RATE_SCALE } from "./options-economics";
import {
  OPTIONS_DEVELOPMENT_PREVIEW_RATE,
  calculateOptionsDevelopmentPreview,
  calculateOptionsNetProfit,
  calculateOptionsScenarioPayout,
  buildOptionsPayoffChartModel,
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
      maxPayout: 95_000_000n,
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
      maxPayout: 5_000_000n,
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
    expect(preview.maxPayout).toBe(240_000_000n);
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

  test("computes net profit and loss after premium for both directions", () => {
    const strike = 50_000_000_000_000_000n;
    const notional = 100_000_000n;
    const premium = 1_000_000n;

    expect(calculateOptionsNetProfit("CALL", strike, notional, premium, 50_000_000_000_000_000n)).toBe(-premium);
    expect(calculateOptionsNetProfit("CALL", strike, notional, premium, 60_000_000_000_000_000n)).toBe(0n);
    expect(calculateOptionsNetProfit("CALL", strike, notional, premium, 70_000_000_000_000_000n)).toBe(1_000_000n);
    expect(calculateOptionsNetProfit("PUT", strike, notional, premium, 40_000_000_000_000_000n)).toBe(0n);
    expect(calculateOptionsNetProfit("PUT", strike, notional, premium, 30_000_000_000_000_000n)).toBe(1_000_000n);
  });

  test("keeps the chart domain local while including strike, breakeven, and reference rate", () => {
    const model = buildOptionsPayoffChartModel({
      kind: "CALL",
      strike: 50_000_000_000_000_000n,
      notional: 100_000_000n,
      premium: 1_000_000n,
      currentRate: 50_000_000_000_000_000n,
    });

    expect(model.minRate).toBe(30_000_000_000_000_000n);
    expect(model.maxRate).toBe(80_000_000_000_000_000n);
    expect(model.minRate).toBeGreaterThan(0n);
    expect(model.maxRate).toBeLessThan(OPTIONS_RATE_SCALE);
    expect(model.points.some((point) => point.rate === model.strike)).toBe(true);
    expect(model.points.some((point) => point.rate === model.breakevenRate)).toBe(true);
    expect(model.points.some((point) => point.rate === model.currentRate)).toBe(true);
  });

  test("extends the local chart to show a reachable capped payout", () => {
    const callModel = buildOptionsPayoffChartModel({
      kind: "CALL",
      strike: 0n,
      notional: 100_000_000n,
      premium: 1_000_000n,
      currentRate: 0n,
    });
    const putModel = buildOptionsPayoffChartModel({
      kind: "PUT",
      strike: OPTIONS_RATE_SCALE,
      notional: 100_000_000n,
      premium: 1_000_000n,
      currentRate: OPTIONS_RATE_SCALE,
    });

    expect(callModel.payoutCapRate).toBe(OPTIONS_RATE_SCALE);
    expect(callModel.points.some((point) => point.rate === OPTIONS_RATE_SCALE)).toBe(true);
    expect(putModel.payoutCapRate).toBe(0n);
    expect(putModel.points.some((point) => point.rate === 0n)).toBe(true);
  });
});
