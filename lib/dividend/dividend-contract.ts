import {
  keccak256,
  stringToBytes,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_TESTNET_CHAIN_ID } from "@/lib/web3/chains";

export const NVDA_DIVIDEND_CONTRACT_MARKET_ID = stringToHex(
  "NVDA-TRADING-YIELD",
  { size: 32 },
);

/**
 * The Testnet canary is intentionally a separate on-chain market namespace.
 * It must not be confused with the Mainnet Pendle market address.
 */
export const NVDA_DIVIDEND_TESTNET_MARKET_ID =
  "0x4e5644412d54524144494e472d5949454c440000000000000000000000000000" as Hex;
export const NVDA_DIVIDEND_TESTNET_POSITION_ID =
  "0x3aec6ae59c3070e654b3b8c905f30dbe76cb7d29c306fc9d031b862e93375f97" as Hex;
export const NVDA_DIVIDEND_TESTNET_OWNER =
  "0x1e1AD136fb877aB473834E869407C7ae59fCFe8B" as Address;

export const dividendRegistryAbi = [
  {
    type: "function",
    name: "accounting",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
  },
  {
    type: "function",
    name: "getMarket",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      {
        name: "market",
        type: "tuple",
        internalType: "struct YeltraDividendRegistry.MarketConfig",
        components: [
          { name: "underlying", type: "address", internalType: "address" },
          { name: "sourceAdapter", type: "address", internalType: "address" },
          { name: "protocolFeeBps", type: "uint16", internalType: "uint16" },
          { name: "lastRateBaseUnits", type: "uint256", internalType: "uint256" },
          { name: "lastRateDecimals", type: "uint8", internalType: "uint8" },
          { name: "lastEventId", type: "bytes32", internalType: "bytes32" },
          { name: "lastEventTimestamp", type: "uint64", internalType: "uint64" },
          { name: "lastSequence", type: "uint64", internalType: "uint64" },
          { name: "enabled", type: "bool", internalType: "bool" },
          { name: "paused", type: "bool", internalType: "bool" },
        ],
      },
    ],
  },
] as const;

export const dividendLensAbi = [
  {
    type: "function",
    name: "dividendState",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "bytes32", internalType: "bytes32" },
      { name: "positionId", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [
      {
        name: "state",
        type: "tuple",
        internalType: "struct YeltraDividendLens.State",
        components: [
          { name: "eligible", type: "bool", internalType: "bool" },
          { name: "enabled", type: "bool", internalType: "bool" },
          { name: "status", type: "uint8", internalType: "enum YeltraDividendLens.Status" },
          { name: "underlying", type: "address", internalType: "address" },
          { name: "sourceAdapter", type: "address", internalType: "address" },
          { name: "currentRateBaseUnits", type: "uint256", internalType: "uint256" },
          { name: "currentRateDecimals", type: "uint8", internalType: "uint8" },
          { name: "accruedBaseUnits", type: "uint256", internalType: "uint256" },
          { name: "lastEventId", type: "bytes32", internalType: "bytes32" },
          { name: "lastEventTimestamp", type: "uint64", internalType: "uint64" },
          { name: "settlementEnabled", type: "bool", internalType: "bool" },
        ],
      },
    ],
  },
] as const;

export const dividendAccountingAbi = [
  {
    type: "function",
    name: "enablePosition",
    stateMutability: "nonpayable",
    inputs: [
      { name: "positionId", type: "bytes32", internalType: "bytes32" },
      { name: "enabled", type: "bool", internalType: "bool" },
    ],
    outputs: [],
  },
] as const;

export const dividendAccountingMarketAbi = [
  {
    type: "function",
    name: "markets",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "index", type: "uint256", internalType: "uint256" },
      { name: "exposureDecimals", type: "uint8", internalType: "uint8" },
      { name: "rewardDecimals", type: "uint8", internalType: "uint8" },
      { name: "enabled", type: "bool", internalType: "bool" },
    ],
  },
] as const;

export const dividendAccountingPositionAbi = [
  {
    type: "function",
    name: "getPosition",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      {
        name: "position",
        type: "tuple",
        internalType: "struct YeltraDividendAccounting.PositionState",
        components: [
          { name: "marketId", type: "bytes32", internalType: "bytes32" },
          { name: "owner", type: "address", internalType: "address" },
          { name: "exposureBaseUnits", type: "uint256", internalType: "uint256" },
          { name: "lastIndex", type: "uint256", internalType: "uint256" },
          { name: "accruedBaseUnits", type: "uint256", internalType: "uint256" },
          { name: "openedAt", type: "uint64", internalType: "uint64" },
          { name: "enabled", type: "bool", internalType: "bool" },
          { name: "closed", type: "bool", internalType: "bool" },
        ],
      },
    ],
  },
] as const;

export type DividendLensState = {
  eligible: boolean;
  enabled: boolean;
  status: number;
  underlying: Address;
  sourceAdapter: Address;
  currentRateBaseUnits: bigint;
  currentRateDecimals: number;
  accruedBaseUnits: bigint;
  lastEventId: Hex;
  lastEventTimestamp: bigint;
  settlementEnabled: boolean;
};

export type DividendAccountingMarketState = {
  index: bigint;
  exposureDecimals: number;
  rewardDecimals: number;
  enabled: boolean;
};

export type DividendDeployment = {
  registry: Address;
  accounting?: Address;
  lens: Address;
};

const publicDividendDeployments = {
  [ROBINHOOD_CHAIN_ID]: {
    registry: process.env.NEXT_PUBLIC_YELTRA_DIVIDEND_REGISTRY_MAINNET,
    accounting: process.env.NEXT_PUBLIC_YELTRA_DIVIDEND_ACCOUNTING_MAINNET,
    lens: process.env.NEXT_PUBLIC_YELTRA_DIVIDEND_LENS_MAINNET,
  },
  [ROBINHOOD_TESTNET_CHAIN_ID]: {
    registry: process.env.NEXT_PUBLIC_YELTRA_DIVIDEND_REGISTRY_TESTNET,
    accounting: process.env.NEXT_PUBLIC_YELTRA_DIVIDEND_ACCOUNTING_TESTNET,
    lens: process.env.NEXT_PUBLIC_YELTRA_DIVIDEND_LENS_TESTNET,
  },
} as const;

function envAddress(value: string | undefined): Address | undefined {
  const normalized = value?.trim();
  return normalized && /^0x[0-9a-fA-F]{40}$/.test(normalized)
    ? (normalized as Address)
    : undefined;
}

export function getDividendDeployment(chainId: number): DividendDeployment | undefined {
  const raw =
    chainId === ROBINHOOD_CHAIN_ID
      ? publicDividendDeployments[ROBINHOOD_CHAIN_ID]
      : chainId === ROBINHOOD_TESTNET_CHAIN_ID
        ? publicDividendDeployments[ROBINHOOD_TESTNET_CHAIN_ID]
        : undefined;
  if (!raw) return undefined;
  const registry = envAddress(raw.registry);
  const accounting = envAddress(raw.accounting);
  const lens = envAddress(raw.lens);
  return registry && lens ? { registry, accounting, lens } : undefined;
}

export function dividendPositionId(positionId: string): Hex {
  if (/^0x[0-9a-fA-F]{64}$/.test(positionId)) return positionId as Hex;
  return keccak256(stringToBytes(positionId));
}

export function dividendMarketId(
  marketId: string,
  chainId = ROBINHOOD_CHAIN_ID,
): Hex {
  if (
    chainId === ROBINHOOD_TESTNET_CHAIN_ID &&
    (marketId === "TEST_DATA:NVDA:46630" ||
      marketId.toLowerCase() === NVDA_DIVIDEND_TESTNET_MARKET_ID.toLowerCase())
  ) {
    return NVDA_DIVIDEND_TESTNET_MARKET_ID;
  }
  if (
    chainId === ROBINHOOD_CHAIN_ID &&
    marketId.toLowerCase() === "0x206a5cd00e9ffabb8ca564076b64799a78df19b9"
  ) {
    return NVDA_DIVIDEND_CONTRACT_MARKET_ID;
  }
  if (/^0x[0-9a-fA-F]{64}$/.test(marketId)) return marketId as Hex;
  return keccak256(stringToBytes(marketId));
}
