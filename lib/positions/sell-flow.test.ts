import { describe, expect, it } from "bun:test";
import {
  EXIT_TRANSACTION_UNAVAILABLE_MESSAGE,
  getSellFlowActionLabel,
  getSellQuoteContext,
  hasSellQuoteContextChanged,
  isExecutableExitQuote,
  isSellFlowBusy,
  requiresSellApproval,
} from "./sell-flow";

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

  it("only treats a quote with executable calldata as sell-ready", () => {
    const validQuote = {
      transaction: {
        to: "0x888888888889758F76e7103c6CbF23ABbF58F946" as `0x${string}`,
        data: "0x594a88cc" as `0x${string}`,
        value: BigInt(0),
      },
    };

    expect(isExecutableExitQuote(validQuote)).toBe(true);
    expect(isExecutableExitQuote({
      transaction: { ...validQuote.transaction, data: "0x" as `0x${string}` },
    })).toBe(false);
    expect(isExecutableExitQuote(undefined)).toBe(false);
    expect(EXIT_TRANSACTION_UNAVAILABLE_MESSAGE).toContain("Refresh the quote");
  });

  it("invalidates the quote when wallet or chain context changes", () => {
    const connected = getSellQuoteContext("0xAbC0000000000000000000000000000000000001", 4663, 4663);
    const disconnected = getSellQuoteContext(undefined, undefined, 4663);
    const wrongChain = getSellQuoteContext("0xAbC0000000000000000000000000000000000001", 46630, 4663);

    expect(hasSellQuoteContextChanged(connected, connected)).toBe(false);
    expect(hasSellQuoteContextChanged(connected, disconnected)).toBe(true);
    expect(hasSellQuoteContextChanged(connected, wrongChain)).toBe(true);
  });

  it("skips duplicate approval when allowance is sufficient or already confirmed", () => {
    const quote = {
      approvalToken: "0x6982e39521a070a3c40782548bfbed6dc8f566ef" as `0x${string}`,
      approvalAmount: BigInt(100),
    };

    expect(requiresSellApproval(quote, BigInt(99), false)).toBe(true);
    expect(requiresSellApproval(quote, BigInt(100), false)).toBe(false);
    expect(requiresSellApproval(quote, null, true)).toBe(false);
  });
});
