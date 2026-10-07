import {
  isAddress,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

export const MARKET_DIRECTORY_PROVIDER_IDS = {
  PENDLE: stringToHex("PENDLE", { size: 32 }),
  MORPHO: stringToHex("MORPHO", { size: 32 }),
} as const;

export const MARKET_DIRECTORY_MARKET_TYPES = {
  PT_YT: stringToHex("PT_YT", { size: 32 }),
  VAULT: stringToHex("VAULT", { size: 32 }),
} as const;

export const MARKET_DIRECTORY_CONFIRMATION = "YELTRA_MARKET_MAINNET_REGISTER_4663";

export type DirectoryProviderId =
  (typeof MARKET_DIRECTORY_PROVIDER_IDS)[keyof typeof MARKET_DIRECTORY_PROVIDER_IDS];
export type DirectoryMarketType =
  (typeof MARKET_DIRECTORY_MARKET_TYPES)[keyof typeof MARKET_DIRECTORY_MARKET_TYPES];

export type MarketDirectoryEntry = {
  marketId: Hex;
  providerId: Hex;
  marketType: Hex;
  marketAddress: Address;
  underlyingAsset: Address;
  chainId: number;
  enabled: boolean;
  registeredAt: bigint;
};

export type ExternalMarketCandidate = {
  chainId: number;
  expectedChainId: number;
  providerId: Hex;
  marketType: Hex;
  marketAddress: Address;
  underlyingAsset: Address;
  expectedUnderlying: Address;
  bytecodePresent: boolean;
};

export type ExternalMarketValidation =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "wrong-chain"
        | "unsupported-provider"
        | "unsupported-market-type"
        | "invalid-contract"
        | "underlying-mismatch";
    };

export const yeltraMarketDirectoryAbi = [
  {
    name: "accessManager",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "allMarketIds",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "getMarket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [
      {
        name: "record",
        type: "tuple",
        components: [
          { name: "marketId", type: "bytes32" },
          { name: "providerId", type: "bytes32" },
          { name: "marketType", type: "bytes32" },
          { name: "marketAddress", type: "address" },
          { name: "underlyingAsset", type: "address" },
          { name: "chainId", type: "uint256" },
          { name: "enabled", type: "bool" },
          { name: "registeredAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "isRegisteredMarket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "market", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "registerMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "providerId", type: "bytes32" },
      { name: "marketType", type: "bytes32" },
      { name: "marketAddress", type: "address" },
      { name: "underlyingAsset", type: "address" },
      { name: "chainId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export function directoryLabel(value: Hex): string {
  const hex = value.slice(2).replace(/00+$/i, "");
  let label = "";
  for (let index = 0; index < hex.length; index += 2) {
    label += String.fromCharCode(Number.parseInt(hex.slice(index, index + 2), 16));
  }
  return label.trim().toUpperCase() || value;
}

export function getStableExternalMarketId(
  providerId: Hex,
  chainId: number,
  marketAddress: Address,
): string {
  return `${directoryLabel(providerId).toLowerCase()}:${chainId}:${marketAddress.toLowerCase()}`;
}

export function getDirectoryMarketId(
  providerId: Hex,
  chainId: number,
  marketAddress: Address,
): Hex {
  return keccak256(stringToHex(`${directoryLabel(providerId)}:${chainId}:${marketAddress.toLowerCase()}`));
}

export function validateExternalMarketCandidate(
  candidate: ExternalMarketCandidate,
): ExternalMarketValidation {
  if (candidate.chainId !== candidate.expectedChainId) {
    return { ok: false, reason: "wrong-chain" };
  }
  if (
    candidate.providerId !== MARKET_DIRECTORY_PROVIDER_IDS.PENDLE &&
    candidate.providerId !== MARKET_DIRECTORY_PROVIDER_IDS.MORPHO
  ) {
    return { ok: false, reason: "unsupported-provider" };
  }
  if (
    candidate.marketType !== MARKET_DIRECTORY_MARKET_TYPES.PT_YT &&
    candidate.marketType !== MARKET_DIRECTORY_MARKET_TYPES.VAULT
  ) {
    return { ok: false, reason: "unsupported-market-type" };
  }
  if (!candidate.bytecodePresent || !isAddress(candidate.marketAddress)) {
    return { ok: false, reason: "invalid-contract" };
  }
  if (!sameAddress(candidate.underlyingAsset, candidate.expectedUnderlying)) {
    return { ok: false, reason: "underlying-mismatch" };
  }
  return { ok: true };
}

function tupleValue<T>(value: unknown, index: number, key: string): T {
  if (Array.isArray(value)) return value[index] as T;
  if (value && typeof value === "object") return (value as Record<string, unknown>)[key] as T;
  throw new Error(`Directory returned an invalid ${key} value.`);
}

export async function readYeltraMarketDirectory(
  client: PublicClient,
  directoryAddress: Address,
): Promise<MarketDirectoryEntry[]> {
  const ids = await client.readContract({
    address: directoryAddress,
    abi: yeltraMarketDirectoryAbi,
    functionName: "allMarketIds",
  });
  const entries: MarketDirectoryEntry[] = [];
  for (const marketId of ids) {
    const result = await client.readContract({
      address: directoryAddress,
      abi: yeltraMarketDirectoryAbi,
      functionName: "getMarket",
      args: [marketId],
    });
    entries.push({
      marketId: tupleValue<Hex>(result, 0, "marketId"),
      providerId: tupleValue<Hex>(result, 1, "providerId"),
      marketType: tupleValue<Hex>(result, 2, "marketType"),
      marketAddress: tupleValue<Address>(result, 3, "marketAddress"),
      underlyingAsset: tupleValue<Address>(result, 4, "underlyingAsset"),
      chainId: Number(tupleValue<bigint>(result, 5, "chainId")),
      enabled: tupleValue<boolean>(result, 6, "enabled"),
      registeredAt: tupleValue<bigint>(result, 7, "registeredAt"),
    });
  }
  return entries;
}
