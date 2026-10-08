import type { DividendEligibility, DividendEvent, DividendPosition } from "./dividend-types";

export function evaluateDividendEligibility(
  position: DividendPosition,
  event: DividendEvent | undefined,
  expectedMarketId?: string,
  expectedUnderlying?: `0x${string}`,
): DividendEligibility {
  if (!event) return { eligible: false, reason: "NO DIVIDEND EVENT DETECTED" };
  if (position.strategy !== "long") return { eligible: false, reason: "POSITION IS NOT TRADING YIELD" };
  if (position.status === "closed") return { eligible: false, reason: "POSITION IS CLOSED" };
  if (expectedMarketId !== undefined && position.marketId !== expectedMarketId) {
    return { eligible: false, reason: "MARKET MAPPING DOES NOT MATCH POSITION" };
  }
  if (position.chainId !== event.chainId) {
    return { eligible: false, reason: "POSITION NETWORK DOES NOT MATCH DIVIDEND EVENT" };
  }
  if (
    expectedUnderlying &&
    position.underlyingTokenAddress?.toLowerCase() !== expectedUnderlying.toLowerCase()
  ) {
    return { eligible: false, reason: "POSITION UNDERLYING DOES NOT MATCH MARKET" };
  }
  if (
    position.underlyingTokenAddress &&
    event.tokenAddress &&
    position.underlyingTokenAddress.toLowerCase() !== event.tokenAddress.toLowerCase()
  ) {
    return { eligible: false, reason: "POSITION UNDERLYING DOES NOT MATCH DIVIDEND EVENT" };
  }
  if (position.assetSymbol.toUpperCase() !== event.tokenSymbol.toUpperCase()) {
    return { eligible: false, reason: "POSITION ASSET DOES NOT MATCH DIVIDEND EVENT" };
  }
  if (BigInt(position.ytAmountBaseUnits) <= BigInt(0)) return { eligible: false, reason: "NO YT EXPOSURE" };
  return { eligible: true, reason: "ACTIVE LONG POSITION MATCHES DIVIDEND EVENT" };
}
