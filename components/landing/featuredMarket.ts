import type { YieldMarket } from "@/types/market";

/**
 * Which market the landing page features. Market data is never hardcoded in UI:
 * it comes from `useMarkets()` (mock or live adapter), and the featured market is
 * simply the first one that can still be traded, in the adapter's own order — so the
 * data side decides what leads by ordering the list.
 */
export function pickFeaturedMarket(markets: readonly YieldMarket[]): YieldMarket | null {
  return markets.find((m) => m.status === "active" || m.status === "maturing") ?? markets[0] ?? null;
}

/**
 * Reference ticket for landing quotes. TradePreview and the split-engine section both use it,
 * so they share one cached quote (same query key) instead of asking the adapter twice.
 */
export const DEFAULT_TICKET = 1_000;

/**
 * `/markets/<id>?strategy=…&amount=…` — where landing CTAs go. Trading lives on the
 * market page (there is no `/trade` route), which preselects the strategy and amount.
 */
export function marketHref(marketId: string, strategy?: "fixed" | "long", amount?: number): string {
  const query = new URLSearchParams();
  if (strategy) query.set("strategy", strategy);
  if (amount !== undefined) query.set("amount", String(amount));
  const qs = query.toString();
  return `/markets/${marketId}${qs ? `?${qs}` : ""}`;
}
