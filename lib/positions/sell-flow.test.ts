import { describe, expect, it } from "bun:test";
import { getSellFlowActionLabel, isSellFlowBusy } from "./sell-flow";

describe("Sell Early review flow", () => {
  it("keeps quote, approval, and sell transaction states distinct", () => {
    expect(getSellFlowActionLabel("quoting")).toBe("Fetching Exit Quote…");
    expect(getSellFlowActionLabel("approving")).toBe("Approving PT…");
    expect(getSellFlowActionLabel("confirming")).toBe("Confirm Sell Early…");
    expect(getSellFlowActionLabel("pending")).toBe("Transaction Pending…");
    expect(getSellFlowActionLabel("success")).toBe("Position Sold");
  });

  it("only marks in-flight wallet states as busy", () => {
    expect(isSellFlowBusy("review")).toBe(false);
    expect(isSellFlowBusy("ready")).toBe(false);
    expect(isSellFlowBusy("approving")).toBe(true);
    expect(isSellFlowBusy("pending")).toBe(true);
  });
});
