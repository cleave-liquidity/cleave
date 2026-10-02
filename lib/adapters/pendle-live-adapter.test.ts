import { describe, expect, it } from "bun:test";
import { normalizePendleMarket, normalizePendleTransaction, pendleLiveYieldAdapter } from "./pendle-live-adapter";

const underlying = {
  address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as `0x${string}`,
  symbol: "USDG",
  name: "Global Dollar",
  decimals: 6,
  chainId: 4663 as const,
};

const pendleAssets = new Map([
  ["0x6982e39521a070a3c40782548bfbed6dc8f566ef", { decimals: 6, symbol: "PT-USDG-25MAR2027", name: "PT USDG" }],
  ["0xf35ee6bd9a93fe42bc7e628bfc4ddbdc6de1f615", { decimals: 6, symbol: "YT-USDG-25MAR2027", name: "YT USDG" }],
]);

describe("Pendle live market normalization", () => {
  it("keeps official addresses and converts source APY fractions to display percentages", () => {
    const market = normalizePendleMarket(
      {
        name: "USDG",
        protocol: "Robinhood",
        icon: "https://example.invalid/usdg.svg",
        address: "0xc2b89e6eca583e2c232201ac557e9be58af55f4c",
        expiry: "2027-03-25T00:00:00.000Z",
        pt: "4663-0x6982e39521a070a3c40782548bfbed6dc8f566ef",
        yt: "4663-0xf35ee6bd9a93fe42bc7e628bfc4ddbdc6de1f615",
        sy: "4663-0x8d3127aabf76f95fe2970a0480b8662b4ad4c286",
        underlyingAsset: "4663-0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
        details: { liquidity: 51302, underlyingApy: 0.033, impliedApy: 0.0345 },
        marketInfo: { assetDescription: "<p>USDG market</p>" },
      },
      4663,
      underlying,
      new Map([
        ...pendleAssets,
        ["0x8d3127aabf76f95fe2970a0480b8662b4ad4c286", { decimals: 18, symbol: "SY-USDG", name: "SY USDG" }],
      ]),
    );

    expect(market).toMatchObject({
      id: "0xc2b89e6eca583e2c232201ac557e9be58af55f4c",
      marketAddress: "0xc2b89e6eca583e2c232201ac557e9be58af55f4c",
      ptAddress: "0x6982e39521a070a3c40782548bfbed6dc8f566ef",
      ytAddress: "0xf35ee6bd9a93fe42bc7e628bfc4ddbdc6de1f615",
      dataMode: "live",
      chainId: 4663,
    });
    expect(market?.underlyingApy).toBeCloseTo(3.3, 8);
    expect(market?.impliedApy).toBeCloseTo(3.45, 8);
    expect(market?.description).toBe("USDG market");
    expect(market?.assetMetadata?.iconUrl).toBe("https://example.invalid/usdg.svg");
    expect(market?.protocolMetadata?.iconUrl).toBeUndefined();
  });

  it("rejects a market missing verified token addresses or live financial fields", () => {
    const market = normalizePendleMarket(
      { address: "0x0000000000000000000000000000000000000001", details: null },
      4663,
      underlying,
      pendleAssets,
    );
    expect(market).toBeNull();
  });

  it("normalizes zero-value Pendle routes and rejects malformed values", () => {
    const transaction = normalizePendleTransaction({
      to: "0x888888888889758F76e7103c6CbF23ABbF58F946",
      from: "0x1111111111111111111111111111111111111111",
      data: "0x1234",
    });

    expect(transaction.value).toBe(BigInt(0));
    expect(() => normalizePendleTransaction({ to: "0x0000000000000000000000000000000000000001", data: "0x1234" })).not.toThrow();
    expect(() => normalizePendleTransaction({ to: "0x0000000000000000000000000000000000000001", data: "0x1234", value: "-1" })).toThrow();
  });

  it("reports testnet as unavailable instead of falling back to mainnet live data", async () => {
    const previous = process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV;
    process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV = "testnet";
    try {
      await expect(pendleLiveYieldAdapter.getMarkets()).rejects.toMatchObject({
        code: "live-source-unavailable",
      });
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV;
      else process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV = previous;
    }
  });
});
