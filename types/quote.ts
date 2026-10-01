export interface FixedYieldQuote {
  inputAmount: number;
  ptReceived: number;
  quotedFixedApy: number;
  priceImpact: number;
  estimatedMaturityValue: number;
  ptPrice: number;
  daysToMaturity: number;
}

export interface LongYieldQuote {
  inputAmount: number;
  ytReceived: number;
  underlyingApy: number;
  impliedApy: number;
  estimatedBreakEvenApy: number;
  priceImpact: number;
  estimatedYieldExposure: number; // e.g. leverage notion balance (approx inputAmount / ytPrice)
  ytPrice: number;
  daysToMaturity: number;
  estimatedReturns: {
    currentRate: { apy: number; returnAmount: number; percentChange: number };
    lowerRate: { apy: number; returnAmount: number; percentChange: number };
    higherRate: { apy: number; returnAmount: number; percentChange: number };
  };
}
