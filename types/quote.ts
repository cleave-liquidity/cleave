export interface FixedYieldQuote {
  quoteId: string;
  marketId: string;
  inputAmount: number;
  ptReceived: number;
  impliedApy: number;
  quotedFixedApy: number;
  priceImpact: number;
  networkFeeEstimate?: number;
  estimatedMaturityValue: number;
  ptPrice: number;
  daysToMaturity: number;
  quoteTimestamp: number;
  quoteExpiry: number;
  blockNumber?: bigint;
  source?: string;
  inputBaseUnits?: bigint;
  outputBaseUnits?: bigint;
  approvalToken?: `0x${string}`;
  approvalAmount?: bigint;
}

export interface LongYieldQuote {
  quoteId: string;
  marketId: string;
  inputAmount: number;
  ytReceived: number;
  underlyingApy: number;
  impliedApy: number;
  estimatedBreakEvenApy: number;
  priceImpact: number;
  networkFeeEstimate?: number;
  estimatedYieldExposure: number; // YT notional that receives the yield stream
  ytPrice: number;
  daysToMaturity: number;
  quoteTimestamp: number;
  quoteExpiry: number;
  blockNumber?: bigint;
  source?: string;
  estimatedReturns?: {
    currentRate: { apy: number; returnAmount: number; percentChange: number };
    lowerRate: { apy: number; returnAmount: number; percentChange: number };
    higherRate: { apy: number; returnAmount: number; percentChange: number };
  };
  inputBaseUnits?: bigint;
  outputBaseUnits?: bigint;
  approvalToken?: `0x${string}`;
  approvalAmount?: bigint;
}

export interface ExitQuote {
  quoteId: string;
  positionId: string;
  marketId: string;
  chainId: number;
  inputToken: Address;
  inputSymbol: string;
  inputAmount: number;
  outputToken: Address;
  outputSymbol: string;
  outputAmount: number;
  minimumReceived: number;
  priceImpact: number;
  networkFeeEstimate?: number;
  maturity: string;
  quoteTimestamp: number;
  quoteExpiry: number;
  inputBaseUnits: bigint;
  outputBaseUnits: bigint;
  approvalToken?: Address;
  approvalAmount?: bigint;
  spender: Address;
  transaction: {
    to: Address;
    data: Hex;
    value: bigint;
    from?: Address;
  };
  source?: string;
}
import type { Address, Hex } from "viem";
