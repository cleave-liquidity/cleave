import { YieldMarket } from "@/types/market";
import { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import { FixedYieldPosition, LongYieldPosition, YieldPosition } from "@/types/position";

export interface YieldMarketAdapter {
  getMarkets(): Promise<YieldMarket[]>;
  getMarket(id: string): Promise<YieldMarket | null>;
  getPositions(userAddress?: string): Promise<YieldPosition[]>;
  getFixedQuote(marketId: string, inputAmount: number): Promise<FixedYieldQuote>;
  getLongQuote(marketId: string, inputAmount: number): Promise<LongYieldQuote>;
  openFixedPosition(marketId: string, inputAmount: number, userAddress?: string): Promise<FixedYieldPosition>;
  openLongPosition(marketId: string, inputAmount: number, userAddress?: string): Promise<LongYieldPosition>;
  claimYield(positionId: string): Promise<{ claimedAmount: number; txHash: `0x${string}` }>;
  redeemFixed(positionId: string): Promise<{ redeemedAmount: number; txHash: `0x${string}` }>;
  sellPosition(positionId: string): Promise<{ returnedAmount: number; txHash: `0x${string}` }>;
}
