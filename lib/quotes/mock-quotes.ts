import { YieldMarket } from "@/types/market";
import { FixedYieldQuote, LongYieldQuote } from "@/types/quote";

/**
 * These calculations intentionally model a simple discounted-principal market.
 * They are deterministic UI fixtures, not protocol pricing or an oracle.
 * A live adapter should replace this module with protocol/router quotes.
 */

const DAYS_PER_YEAR = 365;
const MAX_PRICE_IMPACT = 0.05;
const MIN_YT_PRICE = 0.0001;
const MOCK_QUOTE_TTL_MS = 30_000;

function yearFraction(days: number): number {
  return Math.max(days, 1) / DAYS_PER_YEAR;
}

function priceImpactRate(inputAmount: number, liquidityUsd: number): number {
  if (liquidityUsd <= 0) return MAX_PRICE_IMPACT;
  return Math.min(MAX_PRICE_IMPACT, (inputAmount / liquidityUsd) * 0.1);
}

function round(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

function scenario(
  inputAmount: number,
  ytReceived: number,
  apy: number,
  fraction: number
) {
  const returnAmount = ytReceived * (apy / 100) * fraction;
  return {
    apy: round(apy, 2),
    returnAmount: round(returnAmount, 2),
    percentChange: round(((returnAmount - inputAmount) / inputAmount) * 100, 1),
  };
}

export function calculateFixedQuote(
  market: YieldMarket,
  inputAmount: number
): FixedYieldQuote {
  const fraction = yearFraction(market.daysRemaining);
  const impactRate = priceImpactRate(inputAmount, market.liquidityUsd);
  const effectiveImpliedApy = market.impliedApy * (1 - impactRate);
  const ptPrice = 1 / (1 + (effectiveImpliedApy / 100) * fraction);
  const ptReceived = inputAmount / ptPrice;
  const estimatedMaturityValue = ptReceived;
  const quotedFixedApy =
    (Math.pow(estimatedMaturityValue / inputAmount, 1 / fraction) - 1) * 100;
  const quoteTimestamp = Date.now();

  return {
    marketId: market.id,
    inputAmount,
    ptReceived: round(ptReceived, 6),
    impliedApy: round(market.impliedApy, 2),
    quotedFixedApy: round(quotedFixedApy, 2),
    priceImpact: round(impactRate * 100, 4),
    networkFeeEstimate: 0.0004,
    estimatedMaturityValue: round(estimatedMaturityValue, 2),
    ptPrice: round(ptPrice, 6),
    daysToMaturity: market.daysRemaining,
    quoteTimestamp,
    quoteExpiry: quoteTimestamp + MOCK_QUOTE_TTL_MS,
  };
}

export function calculateLongQuote(
  market: YieldMarket,
  inputAmount: number
): LongYieldQuote {
  const fraction = yearFraction(market.daysRemaining);
  const impactRate = priceImpactRate(inputAmount, market.liquidityUsd);
  const ptPrice = 1 / (1 + (market.impliedApy / 100) * fraction);
  const fairYtPrice = Math.max(MIN_YT_PRICE, 1 - ptPrice);
  const ytPrice = Math.min(1, fairYtPrice * (1 + impactRate));
  const ytReceived = inputAmount / ytPrice;

  // Break-even is derived from the price paid for YT and the time remaining.
  // It is the average realized APY at which the yield stream equals the input.
  const estimatedBreakEvenApy = (ytPrice / fraction) * 100;
  const lowerRateApy = Math.max(
    0,
    Math.min(market.underlyingApy, market.impliedApy) * 0.75
  );
  const higherRateApy = Math.max(market.underlyingApy, market.impliedApy) * 1.2;
  const quoteTimestamp = Date.now();

  return {
    marketId: market.id,
    inputAmount,
    ytReceived: round(ytReceived, 6),
    underlyingApy: round(market.underlyingApy, 2),
    impliedApy: round(market.impliedApy, 2),
    estimatedBreakEvenApy: round(estimatedBreakEvenApy, 2),
    priceImpact: round(impactRate * 100, 4),
    networkFeeEstimate: 0.0004,
    estimatedYieldExposure: round(ytReceived, 2),
    ytPrice: round(ytPrice, 6),
    daysToMaturity: market.daysRemaining,
    quoteTimestamp,
    quoteExpiry: quoteTimestamp + MOCK_QUOTE_TTL_MS,
    estimatedReturns: {
      currentRate: scenario(
        inputAmount,
        ytReceived,
        market.underlyingApy,
        fraction
      ),
      lowerRate: scenario(inputAmount, ytReceived, lowerRateApy, fraction),
      higherRate: scenario(inputAmount, ytReceived, higherRateApy, fraction),
    },
  };
}
