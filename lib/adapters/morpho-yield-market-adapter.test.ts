import { describe, expect, it } from "bun:test";
import { normalizeMorphoVaultMarket } from "./morpho-yield-market-adapter";
import {
  MARKET_DIRECTORY_MARKET_TYPES,
  MARKET_DIRECTORY_PROVIDER_IDS,
} from "../markets/market-directory";

describe("Morpho yield market adapter", () => {
  it("normalizes Steakhouse USDG without fabricating APY, maturity, or liquidity", () => {
    const market = normalizeMorphoVaultMarket(
      {
        marketAddress: "0xBeEff033F34C046626B8D0A041844C5d1A5409dd",
        underlyingAsset: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
        chainId: 4663,
        providerId: MARKET_DIRECTORY_PROVIDER_IDS.MORPHO,
        marketType: MARKET_DIRECTORY_MARKET_TYPES.VAULT,
        registeredAt: 1_791_000_000n,
      },
      {
        name: "Steakhouse USDG",
        symbol: "steakUSDG",
        underlyingSymbol: "USDG",
        underlyingName: "Global Dollar",
        underlyingDecimals: 6,
        vaultDecimals: 18,
        totalAssets: 535152238536167n,
        totalSupply: 530228157650939265646195828n,
        assetsPerShare: 1009286n,
        shareConversion: 990798723123306441n,
        bytecodePresent: true,
      },
    );

    expect(market.providerId).toBe("morpho");
    expect(market.marketType).toBe("vault");
    expect(market.maturity).toBe("Open-ended");
    expect(market.maturityType).toBe("open-ended");
    expect(market.underlyingApy).toBe(0);
    expect(market.impliedApy).toBe(0);
    expect(market.liquidityUsd).toBe(0);
    expect(market.metricAvailability).toEqual({
      underlyingApy: "unavailable",
      impliedApy: "not-applicable",
      liquidityUsd: "unavailable",
      maturity: "not-applicable",
    });
    expect(market.execution?.enabled).toBe(false);
    expect(market.registration?.status).toBe("registered");
    expect(market.providerState?.totalAssetsBaseUnits).toBe("535152238536167");
  });
});
