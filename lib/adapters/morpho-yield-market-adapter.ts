import {
  createPublicClient,
  erc20Abi,
  http,
  type Address,
  type PublicClient,
} from "viem";
import { YieldDomainError } from "@/types/errors";
import type { YieldMarket } from "@/types/market";
import { getVerifiedTokenMetadataByAddress } from "@/lib/metadata/tokens";
import { robinhoodChain, ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";
import {
  getStableExternalMarketId,
  MARKET_DIRECTORY_MARKET_TYPES,
  MARKET_DIRECTORY_PROVIDER_IDS,
  type MarketDirectoryEntry,
} from "@/lib/markets/market-directory";

export const STEAKHOUSE_USDG_VAULT = "0xBeEff033F34C046626B8D0A041844C5d1A5409dd" as Address;
export const USDG_UNDERLYING = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as Address;

const morphoVaultAbi = [
  { name: "asset", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "totalAssets", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "convertToShares", type: "function", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "convertToAssets", type: "function", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;

export type MorphoVaultSnapshot = {
  name: string;
  symbol: string;
  underlyingSymbol: string;
  underlyingName: string;
  underlyingDecimals: number;
  vaultDecimals: number;
  totalAssets: bigint;
  totalSupply: bigint;
  assetsPerShare: bigint;
  shareConversion: bigint;
  bytecodePresent: boolean;
};

export const MORPHO_STEAKHOUSE_USDG_ENTRY: Omit<MarketDirectoryEntry, "marketId" | "registeredAt"> = {
  providerId: MARKET_DIRECTORY_PROVIDER_IDS.MORPHO,
  marketType: MARKET_DIRECTORY_MARKET_TYPES.VAULT,
  marketAddress: STEAKHOUSE_USDG_VAULT,
  underlyingAsset: USDG_UNDERLYING,
  chainId: ROBINHOOD_CHAIN_ID,
  enabled: true,
};

export function normalizeMorphoVaultMarket(
  entry: Pick<MarketDirectoryEntry, "marketAddress" | "underlyingAsset" | "chainId" | "providerId" | "marketType" | "registeredAt">,
  snapshot: MorphoVaultSnapshot,
  directoryAddress?: Address,
): YieldMarket {
  const id = getStableExternalMarketId(entry.providerId, entry.chainId, entry.marketAddress);
  const canonicalAssetMetadata = entry.chainId === ROBINHOOD_CHAIN_ID
    ? getVerifiedTokenMetadataByAddress(ROBINHOOD_CHAIN_ID, entry.underlyingAsset)
    : undefined;
  return {
    id,
    symbol: snapshot.underlyingSymbol,
    name: snapshot.name,
    description: `${snapshot.name} vault on Robinhood Chain.`,
    underlyingAsset: snapshot.underlyingSymbol,
    quoteAsset: snapshot.underlyingSymbol,
    yieldSource: snapshot.name,
    sourceProtocol: "Morpho",
    providerId: "morpho",
    marketType: "vault",
    metricAvailability: {
      underlyingApy: "unavailable",
      impliedApy: "not-applicable",
      liquidityUsd: "unavailable",
      maturity: "not-applicable",
    },
    execution: {
      enabled: false,
      providerId: "morpho",
      reason: "Morpho vault discovery is read-only; no YELTRA execution route is configured.",
    },
    registration: {
      status: "registered",
      directoryAddress,
      registeredAt: new Date(Number(entry.registeredAt) * 1_000).toISOString(),
    },
    providerState: {
      totalAssetsBaseUnits: snapshot.totalAssets.toString(),
      totalSupplyBaseUnits: snapshot.totalSupply.toString(),
      assetsPerShareBaseUnits: snapshot.assetsPerShare.toString(),
      shareConversionBaseUnits: snapshot.shareConversion.toString(),
      underlyingDecimals: snapshot.underlyingDecimals,
      shareDecimals: snapshot.vaultDecimals,
      bytecodePresent: snapshot.bytecodePresent,
    },
    assetMetadata: {
      symbol: canonicalAssetMetadata?.symbol ?? snapshot.underlyingSymbol,
      name: canonicalAssetMetadata?.name ?? snapshot.underlyingName,
      iconUrl: canonicalAssetMetadata?.iconUrl,
    },
    protocolMetadata: { name: "Morpho" },
    yieldSourceMetadata: { name: snapshot.name },
    underlyingApy: 0,
    impliedApy: 0,
    maturity: "Open-ended",
    maturityDate: "",
    maturityType: "open-ended",
    daysRemaining: Number.POSITIVE_INFINITY,
    liquidityUsd: 0,
    status: "active",
    network: "mainnet",
    chainId: ROBINHOOD_CHAIN_ID,
    dataMode: "live",
    marketAddress: entry.marketAddress,
    vaultAddress: entry.marketAddress,
    underlyingTokenAddress: entry.underlyingAsset,
    underlyingDecimals: snapshot.underlyingDecimals,
  };
}

export class MorphoYieldMarketAdapter {
  constructor(private readonly publicClient: PublicClient) {}

  async readVault(entry: Pick<MarketDirectoryEntry, "marketAddress" | "underlyingAsset">): Promise<MorphoVaultSnapshot> {
    const bytecode = await this.publicClient.getBytecode({ address: entry.marketAddress });
    const bytecodePresent = Boolean(bytecode && bytecode !== "0x");
    if (!bytecodePresent) {
      throw new YieldDomainError("live-source-unavailable", `Morpho market has no bytecode at ${entry.marketAddress}.`);
    }

    const [asset, vaultDecimals, totalAssets, totalSupply] = await Promise.all([
      this.read(entry.marketAddress, "asset"),
      this.read(entry.marketAddress, "decimals"),
      this.read(entry.marketAddress, "totalAssets"),
      this.read(entry.marketAddress, "totalSupply"),
    ]);
    if (String(asset).toLowerCase() !== entry.underlyingAsset.toLowerCase()) {
      throw new YieldDomainError("live-source-unavailable", "Morpho vault asset does not match the registered underlying.");
    }

    const underlyingMetadata = getVerifiedTokenMetadataByAddress(
      ROBINHOOD_CHAIN_ID,
      entry.underlyingAsset,
    );
    const underlyingDecimals = underlyingMetadata?.decimals ?? Number(
      await this.publicClient.readContract({
        address: entry.underlyingAsset,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    );
    const [nameResult, symbolResult, assetsPerShare, shareConversion] = await Promise.all([
      this.read(entry.marketAddress, "name"),
      this.read(entry.marketAddress, "symbol"),
      this.read(entry.marketAddress, "convertToAssets", [BigInt(10) ** BigInt(Number(vaultDecimals))]),
      this.read(entry.marketAddress, "convertToShares", [BigInt(10) ** BigInt(underlyingDecimals)]),
    ]);

    return {
      name: String(nameResult),
      symbol: String(symbolResult),
      underlyingSymbol: underlyingMetadata?.symbol ?? String(
        await this.publicClient.readContract({ address: entry.underlyingAsset, abi: erc20Abi, functionName: "symbol" }),
      ),
      underlyingName: underlyingMetadata?.name ?? String(
        await this.publicClient.readContract({ address: entry.underlyingAsset, abi: erc20Abi, functionName: "name" }),
      ),
      underlyingDecimals,
      vaultDecimals: Number(vaultDecimals),
      totalAssets: totalAssets as bigint,
      totalSupply: totalSupply as bigint,
      assetsPerShare: assetsPerShare as bigint,
      shareConversion: shareConversion as bigint,
      bytecodePresent,
    };
  }

  async getMarket(entry: MarketDirectoryEntry, directoryAddress?: Address): Promise<YieldMarket> {
    const snapshot = await this.readVault(entry);
    return normalizeMorphoVaultMarket(entry, snapshot, directoryAddress);
  }

  private async read(
    address: Address,
    functionName: "asset" | "decimals" | "totalAssets" | "totalSupply" | "name" | "symbol" | "convertToAssets" | "convertToShares",
    args: readonly bigint[] = [],
  ): Promise<unknown> {
    return this.publicClient.readContract({
      address,
      abi: functionName === "name" || functionName === "symbol" ? erc20Abi : morphoVaultAbi,
      functionName: functionName as never,
      args: args as never,
    });
  }
}

export function createMorphoPublicClient(rpcUrl: string): PublicClient {
  return createPublicClient({ chain: robinhoodChain, transport: http(rpcUrl) });
}
