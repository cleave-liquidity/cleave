export interface FixedYieldQuote {
  marketId: string;
  inputAmount: number;
  ptReceived: number;
  impliedApy: number;
  quotedFixedApy: number;
  priceImpact: number;
  networkFeeEstimate: number;
  estimatedMaturityValue: number;
  ptPrice: number;
  daysToMaturity: number;
  quoteTimestamp: number;
  quoteExpiry: number;
}

export interface LongYieldQuote {
  marketId: string;
  inputAmount: number;
  ytReceived: number;
  underlyingApy: number;
  impliedApy: number;
  estimatedBreakEvenApy: number;
  priceImpact: number;
  networkFeeEstimate: number;
  estimatedYieldExposure: number; // YT notional that receives the yield stream
  ytPrice: number;
  daysToMaturity: number;
  quoteTimestamp: number;
  quoteExpiry: number;
  estimatedReturns: {
    currentRate: { apy: number; returnAmount: number; percentChange: number };
    lowerRate: { apy: number; returnAmount: number; percentChange: number };
    higherRate: { apy: number; returnAmount: number; percentChange: number };
  };
}
