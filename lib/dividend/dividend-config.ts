import type { YieldMarket } from "@/types/market";

export const NVDA_DIVIDEND_MARKET_ID = "0x206a5cd00e9ffabb8ca564076b64799a78df19b9";
export const NVDA_ROBINHOOD_TOKEN = "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec";
export const NVDA_DIVIDEND_EVENT_RATE = "0.25";
export const NVDA_DIVIDEND_EVENT_DATE = "2026-10-01";

export function isDividendEarnMarket(
  market: Pick<YieldMarket, "id" | "marketAddress" | "underlyingTokenAddress">,
): boolean {
  const id = market.id.toLowerCase();
  const address = market.marketAddress?.toLowerCase();
  const isNvdaMarket =
    id === NVDA_DIVIDEND_MARKET_ID ||
    id.endsWith(`:4663:${NVDA_DIVIDEND_MARKET_ID}`) ||
    address === NVDA_DIVIDEND_MARKET_ID;
  return (
    isNvdaMarket &&
    (market.underlyingTokenAddress?.toLowerCase() === NVDA_ROBINHOOD_TOKEN ||
      !market.underlyingTokenAddress)
  );
}
