import { describe, expect, it } from "bun:test";
import {
  formatPositionDate,
  formatPositionPnl,
  formatPositionTokenAmount,
  getFixedApyPresentation,
} from "./presentation";

describe("Portfolio position presentation", () => {
  it("formats dates and PT amounts for a readable position row", () => {
    expect(formatPositionDate("2027-03-25T00:00:00.000Z")).toBe("25 Mar 2027");
    expect(formatPositionDate("Live source")).toBe("—");
    expect(formatPositionTokenAmount(1)).toBe("1.00");
    expect(formatPositionTokenAmount(1.0148)).toBe("1.0148");
  });

  it("only labels an APY as quoted when entry data is available", () => {
    expect(getFixedApyPresentation({
      entryDataAvailable: true,
      quotedFixedApy: 3.176138,
      entryImpliedApy: 3.45,
    })).toEqual({ label: "Quoted APY", value: "3.18%" });

    expect(getFixedApyPresentation({
      entryDataAvailable: false,
      quotedFixedApy: 3.276138,
      entryImpliedApy: 3.276138,
    })).toEqual({ label: "Current implied APY", value: "3.28%" });
  });

  it("does not invent PnL when entry data is unavailable", () => {
    expect(formatPositionPnl(0.0148, false)).toBe("—");
    expect(formatPositionPnl(0.0148, true)).toBe("+$0.01");
    expect(formatPositionPnl(-0.0148, true)).toBe("-$0.01");
  });
});
