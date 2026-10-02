import { describe, expect, it } from "bun:test";
import {
  getDaysToMaturity,
  getPtPriceAtProgress,
  getTimelineMilestones,
  getYieldSplitSimulation,
  getYieldStreamedAtProgress,
  yieldSplitDemoMarket,
} from "./yield-split-demo";

describe("yield split demo calculations", () => {
  it("calculates a positive reference-to-maturity lifecycle", () => {
    expect(
      getDaysToMaturity(
        yieldSplitDemoMarket.referenceDate,
        yieldSplitDemoMarket.maturityDate,
      ),
    ).toBe(175);
  });

  it("generates the seven deterministic timeline milestones", () => {
    const milestones = getTimelineMilestones(yieldSplitDemoMarket);

    expect(milestones).toHaveLength(7);
    expect(milestones[0]).toMatchObject({
      label: "TODAY",
      date: "02 Oct 2026",
    });
    expect(milestones[5]).toMatchObject({
      label: "MAR",
      date: "10 Mar 2027",
    });
    expect(milestones[6]).toMatchObject({
      label: "MATURITY",
      date: "26 Mar 2027",
    });
  });

  it("starts fully split and reaches maturity at progress one", () => {
    const start = getYieldSplitSimulation(yieldSplitDemoMarket, 0);
    const maturity = getYieldSplitSimulation(yieldSplitDemoMarket, 1);

    expect(start).toMatchObject({
      currentDate: "02 Oct 2026",
      daysLeft: 175,
      currentPtPrice: 0.941,
      yieldStreamed: 0,
      isFullZipped: false,
    });
    expect(maturity).toMatchObject({
      currentDate: "26 Mar 2027",
      daysLeft: 0,
      currentPtPrice: 1,
      yieldStreamed: 0.059,
      isFullZipped: true,
    });
  });

  it("keeps PT and streamed-yield calculations within simulation bounds", () => {
    expect(getPtPriceAtProgress(yieldSplitDemoMarket, 1)).toBe(1);
    expect(getYieldStreamedAtProgress(yieldSplitDemoMarket, 0)).toBe(0);
    expect(getYieldStreamedAtProgress(yieldSplitDemoMarket, 1)).toBe(0.059);

    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const streamed = getYieldStreamedAtProgress(yieldSplitDemoMarket, progress);
      expect(streamed).toBeGreaterThanOrEqual(0);
      expect(streamed).toBeLessThanOrEqual(0.059);
    }
  });
});
