import { YieldDomainError } from "@/types/errors";
import { YieldMarket } from "@/types/market";
import { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import { FixedYieldPosition, LongYieldPosition, YieldPosition } from "@/types/position";
import { TokenApprovalRequest, TransactionHash, TransactionReceiptResult } from "@/types/transaction";
import { PositionTransactionResult, YieldAdapterRuntime, YieldMarketAdapter } from "./types";

/**
 * Contract adapter boundary only. It deliberately contains no ABI guesses or
 * fake writes; a future protocol adapter must implement real quote/read/write
 * calls here without changing the UI-facing adapter contract.
 */
export class ContractYieldMarketAdapter implements YieldMarketAdapter {
  readonly mode = "live" as const;
  private unavailable<T>(): Promise<T> {
    return Promise.reject(
      new YieldDomainError(
        "live-integration-not-configured",
      "Live contract integration is not configured for this environment."
      ),
    );
  }

  getMarkets(): Promise<YieldMarket[]> {
    return this.unavailable();
  }

  getMarket(_id: string): Promise<YieldMarket | null> {
    return this.unavailable();
  }

  getPositions(_userAddress?: `0x${string}`, _chainId?: number, _runtime?: YieldAdapterRuntime): Promise<YieldPosition[]> {
    return this.unavailable();
  }

  getFixedQuote(_marketId: string, _inputAmount: number, _runtime?: YieldAdapterRuntime): Promise<FixedYieldQuote> {
    return this.unavailable();
  }

  getLongQuote(_marketId: string, _inputAmount: number, _runtime?: YieldAdapterRuntime): Promise<LongYieldQuote> {
    return this.unavailable();
  }

  openFixedPosition(
    _marketId: string,
    _inputAmount: number,
    _userAddress: `0x${string}`,
    _quote: FixedYieldQuote,
    _chainId?: number,
    _runtime?: YieldAdapterRuntime
  ): Promise<FixedYieldPosition> {
    return this.unavailable();
  }

  openLongPosition(
    _marketId: string,
    _inputAmount: number,
    _userAddress: `0x${string}`,
    _quote: LongYieldQuote,
    _chainId?: number,
    _runtime?: YieldAdapterRuntime
  ): Promise<LongYieldPosition> {
    return this.unavailable();
  }

  getClaimableYield(_position: LongYieldPosition, _now?: number, _runtime?: YieldAdapterRuntime): Promise<number> {
    return this.unavailable();
  }

  approveToken(_request: TokenApprovalRequest, _runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    return this.unavailable();
  }

  getTransactionStatus(_txHash: TransactionHash, _chainId: number, _runtime?: YieldAdapterRuntime): Promise<TransactionReceiptResult> {
    return this.unavailable();
  }

  claimYield(_positionId: string, _userAddress: `0x${string}`, _chainId?: number, _runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    return this.unavailable();
  }

  redeemFixed(_positionId: string, _userAddress: `0x${string}`, _chainId?: number, _runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    return this.unavailable();
  }

  sellPosition(_positionId: string, _userAddress: `0x${string}`, _chainId?: number, _runtime?: YieldAdapterRuntime): Promise<PositionTransactionResult> {
    return this.unavailable();
  }
}
