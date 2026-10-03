import { getConfiguredDataMode } from "@/lib/adapters/config";
import type { YieldMarket } from "@/types/market";

/**
 * Which market(s) the landing page features. Market data is never hardcoded in UI: it comes from
 * `useMarkets()` (mock or live adapter) and these helpers only *choose* among what it returns.
 *
 * Live lists contain expired markets and raw numbers that are not meant for a headline (e.g. an
 * implied APY in the thousands), so a market has to be tradable and sane to be featured.
 */
const MAX_SANE_APY = 100; // %

export function isFeaturable(m: YieldMarket): boolean {
  return (
    (m.status === "active" || m.status === "maturing") &&
    m.daysRemaining > 0 &&
    Number.isFinite(m.impliedApy) &&
    m.impliedApy >= 0 &&
    m.impliedApy <= MAX_SANE_APY &&
    Number.isFinite(m.underlyingApy) &&
    m.underlyingApy >= 0 &&
    m.underlyingApy <= MAX_SANE_APY &&
    m.liquidityUsd > 0
  );
}

/**
 * The market that leads the landing page: a featurable market that actually yields something and is not
 * about to expire, in the adapter's own order (so the data side can still decide what comes first).
 */
export function pickFeaturedMarket(markets: readonly YieldMarket[]): YieldMarket | null {
  const ok = markets.filter(isFeaturable);
  return (
    ok.find((m) => m.underlyingApy > 0 && m.status === "active") ??
    ok.find((m) => m.status === "active") ??
    ok[0] ??
    null
  );
}

/** The most liquid featurable markets, for the landing table. */
export function pickPreviewMarkets(markets: readonly YieldMarket[], count: number): YieldMarket[] {
  return markets
    .filter(isFeaturable)
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
    .slice(0, count);
}

/**
 * Reference ticket (in the quote asset's own units) for landing quotes. Shared by the walkthrough, the
 * split engine and the strategy simulator so they hit the same cached quote key. Live routers price in
 * token units and the asset may be worth anything from cents to hundreds of dollars, so the live ticket
 * is small enough for thin books; the mock engine is happy with a round thousand.
 */
export const DEFAULT_TICKET = getConfiguredDataMode() === "live" ? 100 : 1_000;

/**
 * `/trade/<id>?strategy=…&amount=…` — where landing CTAs go. The market ID
 * is always the normalized adapter ID, and the trade workspace preselects the strategy and amount.
 */
export function marketHref(marketId: string, strategy?: "fixed" | "long", amount?: number): string {
  const query = new URLSearchParams();
  if (strategy) query.set("strategy", strategy);
  if (amount !== undefined) query.set("amount", String(amount));
  const queryString = query.toString();
  return `/trade/${marketId}${queryString ? `?${queryString}` : ""}`;
}
