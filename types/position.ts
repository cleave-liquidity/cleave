export interface FixedYieldPosition {
  id: string;
  marketId: string;
  assetSymbol: string;
  strategy: "fixed";
  depositedAmount: number;
  ptAmount: number;
  currentValue: number;
  pnl: number;
  quotedFixedApy: number;
  maturity: string;
  maturityDate: string;
  openedAt: string;
  status: "active" | "matured" | "redeemed" | "closed";
}

export interface LongYieldPosition {
  id: string;
  marketId: string;
  assetSymbol: string;
  strategy: "long";
  depositedAmount: number;
  ytAmount: number;
  currentValue: number;
  pnl: number;
  claimableYield: number;
  underlyingApyAtOpen: number;
  impliedApyAtOpen: number;
  currentUnderlyingApy: number;
  maturity: string;
  maturityDate: string;
  openedAt: string;
  status: "active" | "matured" | "closed";
}

export type YieldPosition = FixedYieldPosition | LongYieldPosition;
