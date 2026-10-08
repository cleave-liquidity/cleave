import {
  encodeAbiParameters,
  keccak256,
  stringToBytes,
  type Address,
  type Hex,
} from "viem";
import { ROBINHOOD_TESTNET_CHAIN_ID } from "@/lib/web3/chains";

export const DIVIDEND_DEMO_MARKET_ID = keccak256(
  stringToBytes("YELTRA-DEVELOPMENT-NVDA-46630"),
);
export const DIVIDEND_DEMO_POSITION_DOMAIN = keccak256(
  stringToBytes("YELTRA_DIVIDEND_DEMO_POSITION_V1"),
);
export const dividendDemoPositionId = (owner: Address, token: Address): Hex =>
  keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }, { type: "address" }],
      [DIVIDEND_DEMO_POSITION_DOMAIN, BigInt(ROBINHOOD_TESTNET_CHAIN_ID), owner, token],
    ),
  );

export function getDividendDemoTokenAddress(): Address | undefined {
  const value = process.env.NEXT_PUBLIC_YELTRA_DIVIDEND_DEMO_TOKEN_TESTNET?.trim();
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Address) : undefined;
}

export const dividendDemoTokenAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "developmentOnly", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "designatedWallet", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

export const dividendDemoAccountingAbi = [
  ...[{
    type: "function",
    name: "getPosition",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "bytes32" }],
    outputs: [{
      name: "position",
      type: "tuple",
      components: [
        { name: "marketId", type: "bytes32" },
        { name: "owner", type: "address" },
        { name: "exposureBaseUnits", type: "uint256" },
        { name: "lastIndex", type: "uint256" },
        { name: "accruedBaseUnits", type: "uint256" },
        { name: "openedAt", type: "uint64" },
        { name: "enabled", type: "bool" },
        { name: "closed", type: "bool" },
      ],
    }],
  }, {
    type: "function",
    name: "markets",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [
      { name: "index", type: "uint256" },
      { name: "exposureDecimals", type: "uint8" },
      { name: "rewardDecimals", type: "uint8" },
      { name: "enabled", type: "bool" },
    ],
  }, {
    type: "function",
    name: "enablePosition",
    stateMutability: "nonpayable",
    inputs: [{ name: "positionId", type: "bytes32" }, { name: "enabled", type: "bool" }],
    outputs: [],
  }] as const,
] as const;

export const dividendDemoRegistryAbi = [
  {
    type: "function",
    name: "accounting",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getMarket",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [{
      name: "market",
      type: "tuple",
      components: [
        { name: "underlying", type: "address" },
        { name: "sourceAdapter", type: "address" },
        { name: "protocolFeeBps", type: "uint16" },
        { name: "lastRateBaseUnits", type: "uint256" },
        { name: "lastRateDecimals", type: "uint8" },
        { name: "lastEventId", type: "bytes32" },
        { name: "lastEventTimestamp", type: "uint64" },
        { name: "lastSequence", type: "uint64" },
        { name: "enabled", type: "bool" },
        { name: "paused", type: "bool" },
      ],
    }],
  },
] as const;

export const dividendProcessedEvent = {
  type: "event",
  name: "DividendProcessed",
  inputs: [
    { indexed: true, name: "marketId", type: "bytes32" },
    { indexed: true, name: "eventId", type: "bytes32" },
    { indexed: false, name: "rateBaseUnits", type: "uint256" },
    { indexed: false, name: "rateDecimals", type: "uint8" },
    { indexed: false, name: "sequence", type: "uint64" },
  ],
} as const;
