import { YieldMarket } from "@/types/market";
import { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import { FixedYieldPosition, LongYieldPosition, YieldPosition } from "@/types/position";

export interface PositionTransactionResult {
  returnedAmount?: number;
  claimedAmount?: number;
  redeemedAmount?: number;
  txHash: `0x${string}`;
}

export interface YieldMarketAdapter {
  getMarkets(): Promise<YieldMarket[]>;
  getMarket(id: string): Promise<YieldMarket | null>;
  getPositions(userAddress?: `0x${string}`): Promise<YieldPosition[]>;
  getFixedQuote(marketId: string, inputAmount: number): Promise<FixedYieldQuote>;
  getLongQuote(marketId: string, inputAmount: number): Promise<LongYieldQuote>;
  openFixedPosition(
    marketId: string,
    inputAmount: number,
    userAddress: `0x${string}`,
    quote: FixedYieldQuote,
    chainId?: number
  ): Promise<FixedYieldPosition>;
  openLongPosition(
    marketId: string,
    inputAmount: number,
    userAddress: `0x${string}`,
    quote: LongYieldQuote,
    chainId?: number
  ): Promise<LongYieldPosition>;
  getClaimableYield(position: LongYieldPosition, now?: number): Promise<number>;
  claimYield(positionId: string, userAddress: `0x${string}`): Promise<PositionTransactionResult>;
  redeemFixed(positionId: string, userAddress: `0x${string}`): Promise<PositionTransactionResult>;
  sellPosition(positionId: string, userAddress: `0x${string}`): Promise<PositionTransactionResult>;
}
