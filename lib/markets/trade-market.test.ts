import { describe, expect, it } from "bun:test";
import { normalizeTradeMarketId } from "./trade-market";

describe("trade market routes", () => {
  it("accepts a bounded canonical market query and rejects unsafe input", () => {
    expect(normalizeTradeMarketId(" 0xABC ")).toBe("0xABC");
    expect(normalizeTradeMarketId(" ")).toBeUndefined();
    expect(normalizeTradeMarketId("x".repeat(129))).toBeUndefined();
  });

});
