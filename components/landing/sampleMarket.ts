import { MOCK_MARKETS } from "@/lib/markets/mock-markets";

/** The market every landing CTA points at (sample data — see MarketsPreview). */
export const SAMPLE_MARKET_ID = "usdg-morpho-26mar27";
export const SAMPLE_MARKET = MOCK_MARKETS.find((m) => m.id === SAMPLE_MARKET_ID) ?? MOCK_MARKETS[0];

/**
 * `/markets/<id>?strategy=…&amount=…` — where landing CTAs go. Trading lives on the
 * market page (there is no `/trade` route), which preselects the strategy and amount.
 */
export function marketHref(strategy?: "fixed" | "long", amount?: number): string {
  const query = new URLSearchParams();
  if (strategy) query.set("strategy", strategy);
  if (amount !== undefined) query.set("amount", String(amount));
  const qs = query.toString();
  return `/markets/${SAMPLE_MARKET.id}${qs ? `?${qs}` : ""}`;
}
