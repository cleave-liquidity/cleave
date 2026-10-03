import type { YieldMarket } from "@/types/market";
import type { YieldMarketAdapter } from "@/lib/adapters/types";

const MAX_MARKET_QUERY_LENGTH = 128;

export type TradeMarketSelection =
  | { kind: "selected"; market: YieldMarket; requestedId: string }
  | { kind: "default"; market: YieldMarket }
  | { kind: "invalid-market"; requestedId: string }
  | { kind: "unavailable" };

export function normalizeTradeMarketId(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > MAX_MARKET_QUERY_LENGTH) return undefined;
  return normalized;
}

export function selectDefaultTradeMarket(markets: readonly YieldMarket[]): YieldMarket | null {
  return markets.find((market) => market.status === "active")
    ?? markets.find((market) => market.status === "maturing")
    ?? markets[0]
    ?? null;
}

export async function resolveTradeMarket(
  adapter: YieldMarketAdapter,
  requestedId?: string,
): Promise<TradeMarketSelection> {
  if (requestedId !== undefined) {
    const normalizedId = normalizeTradeMarketId(requestedId);
    if (!normalizedId) return { kind: "invalid-market", requestedId };
    const market = await adapter.getMarket(normalizedId);
    return market
      ? { kind: "selected", market, requestedId: normalizedId }
      : { kind: "invalid-market", requestedId: normalizedId };
  }

  const market = selectDefaultTradeMarket(await adapter.getMarkets());
  return market ? { kind: "default", market } : { kind: "unavailable" };
}
