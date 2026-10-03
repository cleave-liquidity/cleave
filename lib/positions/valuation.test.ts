import { describe, expect, it } from "bun:test";
import {
  canClaimYield,
  canRedeemFixed,
  canSellPosition,
  getFixedCurrentValue,
  getLongCurrentValue,
  refreshPositionValuation,
} from "./valuation";
import type { FixedYieldPosition, LongYieldPosition } from "@/types/position";

const owner = "0x0000000000000000000000000000000000000001" as `0x${string}`;
const base = {
  owner,
  marketId: "test-market",
  assetSymbol: "USDG",
  maturity: "Test maturity",
  maturityDate: "2027-01-01T00:00:00.000Z",
  openedAt: "2026-01-01T00:00:00.000Z",
};

function fixed(overrides: Partial<FixedYieldPosition> = {}): FixedYieldPosition {
  return {
    id: "fixed-1",
    ...base,
    strategy: "fixed",
    depositedAmount: 100,
    ptAmount: 108,
    currentValue: 100,
    pnl: 0,
    entryImpliedApy: 7,
    quotedFixedApy: 8,
    mockTxHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    status: "active",
    ...overrides,
  };
}

function long(overrides: Partial<LongYieldPosition> = {}): LongYieldPosition {
  return {
    id: "long-1",
    ...base,
    strategy: "long",
    depositedAmount: 100,
    ytAmount: 100,
    currentValue: 100,
    pnl: 0,
    claimableYield: 2,
    entryUnderlyingApy: 8,
    entryImpliedApy: 7,
    breakEvenApy: 10,
    currentUnderlyingApy: 8,
    lastClaimedAt: "2026-01-01T00:00:00.000Z",
    mockTxHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
    status: "active",
    ...overrides,
  };
}

describe("position valuation and lifecycle guards", () => {
  it("values fixed positions linearly and makes them redeemable at maturity", () => {
    const active = fixed();
    const midpoint = getFixedCurrentValue(active, Date.parse("2026-07-02T00:00:00.000Z"));
    expect(midpoint).toBeGreaterThan(100);
    expect(midpoint).toBeLessThan(108);
    expect(canRedeemFixed(active, Date.parse("2027-01-02T00:00:00.000Z"))).toBe(true);

    const refreshed = refreshPositionValuation(active, Date.parse("2027-01-02T00:00:00.000Z"));
    expect(refreshed.status).toBe("matured");
    expect(refreshed.currentValue).toBe(108);
  });

  it("keeps long yield claimable and never exposes YT as redeemable PT", () => {
    const position = long();
    expect(getLongCurrentValue(position, Date.parse("2026-07-02T00:00:00.000Z"))).toBeLessThan(100);
    expect(canClaimYield(position)).toBe(true);
    expect(canSellPosition(position)).toBe(true);
    expect(canRedeemFixed(position)).toBe(false);
  });

  it("does not allow an active position to sell after its maturity date", () => {
    const maturedFixed = fixed({ maturityDate: "2026-01-01T00:00:00.000Z" });

    expect(canSellPosition(maturedFixed, Date.parse("2026-01-02T00:00:00.000Z"))).toBe(false);
    expect(canRedeemFixed(maturedFixed, Date.parse("2026-01-02T00:00:00.000Z"))).toBe(true);
  });
});
