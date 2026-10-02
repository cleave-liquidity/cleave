import { describe, expect, it } from "bun:test";
import { normalizePendleMarket } from "./pendle-live-adapter";

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
});
