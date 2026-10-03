import { describe, expect, it } from "bun:test";
import { formatNetworkFee, formatPriceImpact } from "./formatters";

describe("formatPriceImpact", () => {
  it("rounds readable impacts to two decimals", () => {
    expect(formatPriceImpact(0.4)).toBe("0.40%");
    expect(formatPriceImpact(2.345)).toMatch(/^2\.3[45]%$/);
  });

  it("does not print raw floats for tiny impacts", () => {
    expect(formatPriceImpact(0.007949170015582442)).toBe("<0.01%");
  });

  it("keeps zero explicit and guards non-finite values", () => {
    expect(formatPriceImpact(0)).toBe("0.00%");
    expect(formatPriceImpact(Number.NaN)).toBe("—");
  });
});

describe("formatNetworkFee", () => {
  it("trims a raw ETH estimate to six decimals", () => {
    expect(formatNetworkFee(0.000010479932584)).toBe("~0.000010 ETH");
  });

  it("never rounds a real fee down to a misleading zero", () => {
    expect(formatNetworkFee(0.0000000042)).toBe("<0.000001 ETH");
    expect(formatNetworkFee(0)).toBe("0 ETH");
  });
});
