import { YieldDomainError } from "@/types/errors";
import { YieldMarket } from "@/types/market";
import { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import { FixedYieldPosition, LongYieldPosition, YieldPosition } from "@/types/position";
import { PositionTransactionResult, YieldMarketAdapter } from "./types";

/**
 * Contract adapter boundary only. It deliberately contains no ABI guesses or
 * fake writes; a future protocol adapter must implement real quote/read/write
 * calls here without changing the UI-facing adapter contract.
 */
export class ContractYieldMarketAdapter implements YieldMarketAdapter {
  readonly mode = "live" as const;
  private unavailable(): never {
    throw new YieldDomainError(
      "rpc-unavailable",
      "Live contract integration is not configured for this environment."
    );
  }

  getMarkets(): Promise<YieldMarket[]> {
    return Promise.reject(this.unavailable());
  }

  getMarket(_id: string): Promise<YieldMarket | null> {
    return Promise.reject(this.unavailable());
  }

  getPositions(_userAddress?: `0x${string}`): Promise<YieldPosition[]> {
    return Promise.reject(this.unavailable());
  }

  getFixedQuote(_marketId: string, _inputAmount: number): Promise<FixedYieldQuote> {
    return Promise.reject(this.unavailable());
  }

  getLongQuote(_marketId: string, _inputAmount: number): Promise<LongYieldQuote> {
    return Promise.reject(this.unavailable());
  }

  openFixedPosition(
    _marketId: string,
    _inputAmount: number,
    _userAddress: `0x${string}`,
    _quote: FixedYieldQuote,
    _chainId?: number
  ): Promise<FixedYieldPosition> {
    return Promise.reject(this.unavailable());
  }

  openLongPosition(
    _marketId: string,
    _inputAmount: number,
    _userAddress: `0x${string}`,
    _quote: LongYieldQuote,
    _chainId?: number
  ): Promise<LongYieldPosition> {
    return Promise.reject(this.unavailable());
  }

  getClaimableYield(_position: LongYieldPosition, _now?: number): Promise<number> {
    return Promise.reject(this.unavailable());
  }

  claimYield(_positionId: string, _userAddress: `0x${string}`): Promise<PositionTransactionResult> {
    return Promise.reject(this.unavailable());
  }

  redeemFixed(_positionId: string, _userAddress: `0x${string}`): Promise<PositionTransactionResult> {
    return Promise.reject(this.unavailable());
  }

  sellPosition(_positionId: string, _userAddress: `0x${string}`): Promise<PositionTransactionResult> {
    return Promise.reject(this.unavailable());
  }
}
