import { describe, expect, it } from "bun:test";
import { formatNativeBalance, formatNetworkFee, formatPriceImpact } from "./formatters";

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

describe("formatNativeBalance", () => {
  it("keeps a small positive ETH balance visible", () => {
    expect(formatNativeBalance(0.00069)).toBe("0.00069");
    expect(formatNativeBalance(0.0042)).toBe("0.0042");
    expect(formatNativeBalance(0)).toBe("0");
  });

  it("does not round a tiny positive balance down to zero", () => {
    expect(formatNativeBalance(0.0000004)).toBe("<0.000001");
    expect(formatNativeBalance(Number.NaN)).toBe("—");
  });
});
