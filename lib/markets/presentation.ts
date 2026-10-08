import type { YieldMarket } from "@/types/market";

type MarketWithLiquidity = Pick<YieldMarket, "liquidityUsd" | "metricAvailability">;

export type KnownLiquiditySummary = {
  total: number | null;
  knownMarkets: number;
  totalMarkets: number;
};

export function hasKnownMarketLiquidity(market: MarketWithLiquidity): boolean {
  const availability = market.metricAvailability?.liquidityUsd;
  return (
    availability !== "unavailable" &&
    availability !== "not-applicable" &&
    Number.isFinite(market.liquidityUsd)
  );
}

export function summarizeKnownLiquidity(markets: MarketWithLiquidity[]): KnownLiquiditySummary {
  const knownMarkets = markets.filter(hasKnownMarketLiquidity);
  return {
    total: knownMarkets.length
      ? knownMarkets.reduce((sum, market) => sum + market.liquidityUsd, 0)
      : null,
    knownMarkets: knownMarkets.length,
    totalMarkets: markets.length,
  };
}

function marketSymbol(market: YieldMarket): string {
  return (market.assetMetadata?.symbol || market.symbol).toLowerCase();
}

function shortAddress(address?: string): string | undefined {
  if (!address) return undefined;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function hasFixedMaturity(market: YieldMarket): boolean {
  return market.maturityType !== "open-ended" && Boolean(market.maturityDate);
}

export function getMarketSecondaryLabel(
  market: YieldMarket,
  markets: YieldMarket[] = [market],
): string {
  if (market.execution?.enabled === false && market.yieldSourceMetadata?.name) {
    return market.yieldSourceMetadata.name;
  }

  const siblings = markets.filter((candidate) => marketSymbol(candidate) === marketSymbol(market));
  if (siblings.length > 1 && hasFixedMaturity(market)) {
    const seriesLabel = `${market.maturity} Series`;
    const sameSeries = siblings.filter(
      (candidate) => hasFixedMaturity(candidate) && candidate.maturity === market.maturity,
    );
    if (sameSeries.length > 1) {
      const address = shortAddress(market.marketAddress);
      return address ? `${seriesLabel} · ${address}` : seriesLabel;
    }
    return seriesLabel;
  }

  return market.assetMetadata?.name || market.name;
}
