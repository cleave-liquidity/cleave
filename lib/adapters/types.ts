import { MarketDataMode, YieldMarket } from "@/types/market";
import { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import { FixedYieldPosition, LongYieldPosition, YieldPosition } from "@/types/position";
import { TokenApprovalRequest, TransactionHash, TransactionReceiptResult } from "@/types/transaction";
import type { PublicClient, WalletClient } from "viem";

export interface YieldAdapterRuntime {
  publicClient?: PublicClient;
  walletClient?: WalletClient;
}

export interface PositionTransactionResult {
  returnedAmount?: number;
  claimedAmount?: number;
  redeemedAmount?: number;
  txHash: `0x${string}`;
  chainId?: number;
  status?: TransactionReceiptResult["status"];
  blockNumber?: bigint;
  timestamp?: number;
}

export interface YieldMarketAdapter {
  readonly mode: MarketDataMode;
  getMarkets(): Promise<YieldMarket[]>;
  getMarket(id: string): Promise<YieldMarket | null>;
  getPositions(userAddress?: `0x${string}`, chainId?: number, runtime?: YieldAdapterRuntime): Promise<YieldPosition[]>;
  getFixedQuote(marketId: string, inputAmount: number, runtime?: YieldAdapterRuntime): Promise<FixedYieldQuote>;
  getLongQuote(marketId: string, inputAmount: number, runtime?: YieldAdapterRuntime): Promise<LongYieldQuote>;
  openFixedPosition(
    marketId: string,
    inputAmount: number,
    userAddress: `0x${string}`,
    quote: FixedYieldQuote,
    chainId?: number,
    runtime?: YieldAdapterRuntime
  ): Promise<FixedYieldPosition>;
  openLongPosition(
    marketId: string,
    inputAmount: number,
    userAddress: `0x${string}`,
    quote: LongYieldQuote,
    chainId?: number,
    runtime?: YieldAdapterRuntime
  ): Promise<LongYieldPosition>;
  getClaimableYield(position: LongYieldPosition, now?: number, runtime?: YieldAdapterRuntime): Promise<number>;
  approveToken(request: TokenApprovalRequest, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult>;
  getTransactionStatus(txHash: TransactionHash, chainId: number, runtime?: YieldAdapterRuntime): Promise<TransactionReceiptResult>;
  claimYield(positionId: string, userAddress: `0x${string}`, chainId?: number, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult>;
  redeemFixed(positionId: string, userAddress: `0x${string}`, chainId?: number, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult>;
  sellPosition(positionId: string, userAddress: `0x${string}`, chainId?: number, runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult>;
}
