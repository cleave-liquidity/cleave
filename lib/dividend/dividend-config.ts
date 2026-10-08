import type { YieldMarket } from "@/types/market";

export const NVDA_DIVIDEND_MARKET_ID = "0x206a5cd00e9ffabb8ca564076b64799a78df19b9";
export const NVDA_ROBINHOOD_TOKEN = "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec";
export const NVDA_DIVIDEND_EVENT_RATE = "0.25";
export const NVDA_DIVIDEND_EVENT_DATE = "2026-10-01";

export type DividendMarketConfig = {
  marketId: string;
  chainId: 4663;
  tokenSymbol: string;
  tokenAddress: `0x${string}`;
  source: "ROBINHOOD_CORPORATE_ACTIONS";
};

/**
 * Only markets with a validated, independently observed corporate-action
 * source belong here. Adding a market requires evidence for the same market,
 * underlying token, and chain; a shared symbol is not sufficient.
 */
const DIVIDEND_MARKETS: readonly DividendMarketConfig[] = [
  {
    marketId: NVDA_DIVIDEND_MARKET_ID,
    chainId: 4663,
    tokenSymbol: "NVDA",
    tokenAddress: NVDA_ROBINHOOD_TOKEN as `0x${string}`,
    source: "ROBINHOOD_CORPORATE_ACTIONS",
  },
];

function matchesMarketId(marketId: string, configuredMarketId: string): boolean {
  const normalized = marketId.toLowerCase();
  const configured = configuredMarketId.toLowerCase();
  return normalized === configured || normalized.endsWith(`:4663:${configured}`);
}

export function getDividendMarketConfig(
  market: Pick<YieldMarket, "id" | "marketAddress" | "underlyingTokenAddress">,
): DividendMarketConfig | undefined {
  const marketAddress = market.marketAddress?.toLowerCase();
  const underlying = market.underlyingTokenAddress?.toLowerCase();
  return DIVIDEND_MARKETS.find(
    (candidate) =>
      (matchesMarketId(market.id, candidate.marketId) ||
        marketAddress === candidate.marketId.toLowerCase()) &&
      (!underlying || underlying === candidate.tokenAddress.toLowerCase()),
  );
}

export function isDividendEarnMarket(
  market: Pick<YieldMarket, "id" | "marketAddress" | "underlyingTokenAddress">,
): boolean {
  return Boolean(getDividendMarketConfig(market));
}
