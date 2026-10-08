export type DividendStatus =
  | "UNAVAILABLE"
  | "ELIGIBLE"
  | "ACTIVE"
  | "PENDING"
  | "CLAIMABLE";

export type DividendType = "CASH_DIVIDEND" | "STOCK_DIVIDEND";
export type DividendSource = "ROBINHOOD_CORPORATE_ACTIONS" | "SIMULATION";
export type DividendEventStatus = "IN_PROGRESS" | "COMPLETED";

export interface DividendEvent {
  eventId: string;
  type: DividendType;
  status: DividendEventStatus;
  tokenSymbol: string;
  underlyingSymbol: string;
  rate: string;
  processDate?: string;
  tokenAddress?: `0x${string}`;
  chainId: number;
  source: DividendSource;
  isSimulation: boolean;
}

export interface DividendPosition {
  positionId: string;
  marketId: string;
  chainId: number;
  assetSymbol: string;
  underlyingTokenAddress?: `0x${string}`;
  strategy: "long";
  ytAmountBaseUnits: string;
  ytDecimals: number;
  openedAt: string;
  maturityDate: string;
  status: "active" | "matured" | "closed";
}

export interface DividendEligibility {
  eligible: boolean;
  reason: string;
}

export interface DividendAccrual {
  grossBaseUnits: bigint;
  accruedBaseUnits: bigint;
  gross: string;
  accrued: string;
}

export interface DividendEarnState {
  positionId: string;
  marketId: string;
  eligible: boolean;
  enabled: boolean;
  status: DividendStatus;
  dividendType?: DividendType;
  source?: DividendSource;
  rate?: string;
  accrued: string;
  claimable: string;
  settlementStatus: "NOT_ENABLED" | "PENDING";
  lastEventId?: string;
  lastEventTimestamp?: string;
  reason: string;
  settlementMode: "READ-ONLY" | "SIMULATION ONLY";
  claimSettlementEnabled: false;
}
