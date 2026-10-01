export type MarketStatus = "active" | "maturing" | "matured" | "paused";
export type MarketDataMode = "mock" | "live";
export type RobinhoodNetwork = "mainnet" | "testnet";

export interface MarketAssetMetadata {
  symbol: string;
  name: string;
  iconUrl?: string;
}

export interface MarketProtocolMetadata {
  name: string;
  iconUrl?: string;
}

export interface YieldMarket {
  id: string;
  symbol: string;
  name: string;
  description: string;
  underlyingAsset: string;
  quoteAsset: string;
  yieldSource: string;
  sourceProtocol?: string;
  assetMetadata?: MarketAssetMetadata;
  protocolMetadata?: MarketProtocolMetadata;

  underlyingApy: number; // e.g. 7.10 means 7.10%
  impliedApy: number;    // e.g. 6.42 means 6.42%

  maturity: string;      // ISO string or formatted "26 Mar 2027"
  maturityDate: string;  // e.g. "2027-03-26"
  daysRemaining: number;
  liquidityUsd: number;

  status: MarketStatus;
  network: RobinhoodNetwork;
  dataMode: MarketDataMode;

  ptAddress?: `0x${string}`;
  ytAddress?: `0x${string}`;
  vaultAddress?: `0x${string}`;
}

export interface HistoricalYieldPoint {
  date: string;
  underlyingApy: number;
  impliedApy: number;
}
