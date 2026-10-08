import { describe, expect, it } from "bun:test";
import {
  getDividendMarketConfig,
  isDividendEarnMarket,
} from "./dividend-config";

describe("Dividend Earn market support", () => {
  it("resolves the validated NVDA market through its canonical identity", () => {
    const config = getDividendMarketConfig({
      id: "pendle:4663:0x206a5cd00e9ffabb8ca564076b64799a78df19b9",
      marketAddress: "0x206a5cd00e9ffabb8ca564076b64799a78df19b9",
      underlyingTokenAddress: "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec",
    });

    expect(config).toMatchObject({
      tokenSymbol: "NVDA",
      marketId: "0x206a5cd00e9ffabb8ca564076b64799a78df19b9",
      chainId: 4663,
    });
    expect(isDividendEarnMarket({
      id: "pendle:4663:0x206a5cd00e9ffabb8ca564076b64799a78df19b9",
      marketAddress: "0x206a5cd00e9ffabb8ca564076b64799a78df19b9",
      underlyingTokenAddress: "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec",
    })).toBe(true);
  });

  it("does not expose Dividend Earn for markets without a validated source", () => {
    expect(getDividendMarketConfig({
      id: "morpho:4663:0xbeeff033f34c046626b8d0a041844c5d1a5409dd",
      marketAddress: "0xbeeff033f34c046626b8d0a041844c5d1a5409dd",
      underlyingTokenAddress: "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
    })).toBeUndefined();
    expect(isDividendEarnMarket({
      id: "morpho:4663:0xbeeff033f34c046626b8d0a041844c5d1a5409dd",
      marketAddress: "0xbeeff033f34c046626b8d0a041844c5d1a5409dd",
      underlyingTokenAddress: "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
    })).toBe(false);
  });
});
