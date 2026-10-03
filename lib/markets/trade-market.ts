const MAX_MARKET_QUERY_LENGTH = 128;

export function normalizeTradeMarketId(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > MAX_MARKET_QUERY_LENGTH) return undefined;
  return normalized;
}
