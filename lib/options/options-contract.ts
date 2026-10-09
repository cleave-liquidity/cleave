import type { Address, Hex } from "viem";

export const OPTIONS_TESTNET_CHAIN_ID = 46630 as const;

// Read-only fallback from the successful Foundry Testnet broadcast receipt.
// It is applied only when the configured market address matches exactly.
const knownTestnetMarketStartBlocks: Record<string, bigint> = {
  "0xd971bf7743d9c7ed76b8c68a17238080c0de14c4": BigInt(131_091_904),
};

export const optionsMarketAbi = [
  { type: "function", name: "rateIndex", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "collateralVault", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "collateralToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "nextOptionId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "quote",
    stateMutability: "view",
    inputs: [
      { name: "kind", type: "uint8" },
      { name: "strike", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "notional", type: "uint256" },
    ],
    outputs: [
      { name: "premium", type: "uint256" },
      { name: "maxPayout", type: "uint256" },
      { name: "currentRate", type: "uint256" },
      { name: "observedAt", type: "uint64" },
      { name: "fresh", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "openOption",
    stateMutability: "nonpayable",
    inputs: [
      { name: "kind", type: "uint8" },
      { name: "strike", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "notional", type: "uint256" },
      { name: "maximumPremium", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "optionId", type: "uint256" },
      { name: "premium", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "options",
    stateMutability: "view",
    inputs: [{ name: "optionId", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "kind", type: "uint8" },
      { name: "state", type: "uint8" },
      { name: "strike", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "notional", type: "uint256" },
      { name: "premium", type: "uint256" },
      { name: "settlementRate", type: "uint256" },
      { name: "payout", type: "uint256" },
      { name: "openedAt", type: "uint256" },
    ],
  },
  { type: "function", name: "settle", stateMutability: "nonpayable", inputs: [{ name: "optionId", type: "uint256" }], outputs: [{ name: "payout", type: "uint256" }] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [{ name: "optionId", type: "uint256" }], outputs: [{ name: "payout", type: "uint256" }] },
] as const;

export const rateIndexAbi = [
  { type: "function", name: "accessManager", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "publishRate", stateMutability: "nonpayable", inputs: [{ name: "rate", type: "uint256" }, { name: "observedAt", type: "uint64" }], outputs: [] },
  { type: "function", name: "latestRate", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "latestObservedAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "isFresh", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "sourceLabel", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "maxStaleness", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const optionsVaultAbi = [
  { type: "function", name: "accessManager", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "collateralToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "market", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "totalBalance", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "availableCollateral", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "lockedCollateral", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "reservedPayout", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const optionsErc20Abi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "DEVELOPMENT_ONLY", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "accessManager", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "recipient", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
] as const;

export type OptionsDeployment = {
  market: Address;
  rateIndex: Address;
  collateralVault: Address;
  collateralToken?: Address;
  deploymentBlock?: bigint;
};

function asAddress(value: string | undefined): Address | undefined {
  const candidate = value?.trim();
  return candidate && /^0x[0-9a-fA-F]{40}$/.test(candidate) ? (candidate as Address) : undefined;
}

export function getOptionsDeployment(chainId: number): OptionsDeployment | undefined {
  if (chainId !== OPTIONS_TESTNET_CHAIN_ID) return undefined;
  const market = asAddress(process.env.NEXT_PUBLIC_YELTRA_OPTIONS_MARKET_TESTNET);
  const rateIndex = asAddress(process.env.NEXT_PUBLIC_YELTRA_OPTIONS_RATE_INDEX_TESTNET);
  const collateralVault = asAddress(process.env.NEXT_PUBLIC_YELTRA_OPTIONS_COLLATERAL_VAULT_TESTNET);
  const collateralToken = asAddress(process.env.NEXT_PUBLIC_YELTRA_OPTIONS_COLLATERAL_TOKEN_TESTNET);
  if (!market || !rateIndex || !collateralVault) return undefined;
  const rawBlock = process.env.NEXT_PUBLIC_YELTRA_OPTIONS_DEPLOYMENT_BLOCK_TESTNET?.trim();
  const configuredBlock = rawBlock && /^\d+$/.test(rawBlock) ? BigInt(rawBlock) : undefined;
  const deploymentBlock = configuredBlock
    ?? knownTestnetMarketStartBlocks[market.toLowerCase()];
  return { market, rateIndex, collateralVault, collateralToken, deploymentBlock };
}

export const optionsExplorerBase = "https://explorer.testnet.chain.robinhood.com";

export function optionsExplorerUrl(address: Address): string {
  return `${optionsExplorerBase}/address/${address}`;
}

export type OptionsEventName = "OptionOpened" | "OptionSettled" | "OptionClaimed";
export type OptionsTransactionHash = Hex;
