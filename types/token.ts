import type { Address } from "viem";
import type { RobinhoodChainId } from "@/types/market";

export interface TokenMetadata {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  chainId: RobinhoodChainId;
  iconUrl?: string;
}

export interface RawBalanceSnapshot {
  raw: bigint;
  decimals: number;
  formatted: string;
  symbol?: string;
  chainId: number;
}
