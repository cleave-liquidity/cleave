import { describe, expect, it } from "bun:test";
import { displayAmountToBaseUnits } from "./amounts";

describe("display amount boundary", () => {
  it("converts a display amount to bigint base units", () => {
    expect(displayAmountToBaseUnits(1.25, 6)).toBe(BigInt(1_250_000));
  });

  it("rejects unsafe display values and invalid decimals", () => {
    expect(() => displayAmountToBaseUnits(Number.POSITIVE_INFINITY, 6)).toThrow(
      "valid amount",
    );
    expect(() => displayAmountToBaseUnits(1, 256)).toThrow(
      "Token decimals are invalid",
    );
  });
});
