export interface FixedYieldPosition {
  id: string;
  owner: `0x${string}`;
  marketId: string;
  assetSymbol: string;
  strategy: "fixed";
  depositedAmount: number;
  ptAmount: number;
  currentValue: number;
  pnl: number;
  entryImpliedApy: number;
  quotedFixedApy: number;
  maturity: string;
  maturityDate: string;
  openedAt: string;
  mockTxHash: `0x${string}`;
  status: "active" | "matured" | "redeemed" | "closed";
}

export interface LongYieldPosition {
  id: string;
  owner: `0x${string}`;
  marketId: string;
  assetSymbol: string;
  strategy: "long";
  depositedAmount: number;
  ytAmount: number;
  currentValue: number;
  pnl: number;
  claimableYield: number;
  entryUnderlyingApy: number;
  entryImpliedApy: number;
  breakEvenApy: number;
  currentUnderlyingApy: number;
  maturity: string;
  maturityDate: string;
  openedAt: string;
  lastClaimedAt: string;
  mockTxHash: `0x${string}`;
  status: "active" | "matured" | "closed";
}

export type YieldPosition = FixedYieldPosition | LongYieldPosition;
