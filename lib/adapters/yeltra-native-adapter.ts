import type { Address, Hex, PublicClient } from "viem";

const nativeRegistryAbi = [
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
        name: "config",
        type: "tuple",
        components: [
          { name: "market", type: "address" },
          { name: "pt", type: "address" },
          { name: "yt", type: "address" },
          { name: "underlying", type: "address" },
          { name: "sourceAdapter", type: "address" },
          { name: "maturity", type: "uint256" },
          { name: "chainId", type: "uint256" },
          { name: "underlyingDecimals", type: "uint8" },
          { name: "createdAt", type: "uint256" },
          { name: "createdBlock", type: "uint256" },
          { name: "enabled", type: "bool" },
          { name: "paused", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "isMarketActive",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const nativeMarketAbi = [
  {
    name: "previewIssue",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "assets", type: "uint256" }],
    outputs: [
      { name: "ptAmount", type: "uint256" },
      { name: "ytAmount", type: "uint256" },
      { name: "sourceShares", type: "uint256" },
    ],
  },
  {
    name: "previewRedemption",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "ptAmount", type: "uint256" }],
    outputs: [
      { name: "assets", type: "uint256" },
      { name: "available", type: "bool" },
    ],
  },
  {
    name: "previewClaim",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    name: "currentSourceAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "currentYieldAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const sourceAdapterAbi = [
  {
    name: "vault",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "asset",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "shareDecimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "sharesHeld",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const sourceVaultAbi = [
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "convertToAssets",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type NativeMarketConfig = {
  market: Address;
  pt: Address;
  yt: Address;
  underlying: Address;
  sourceAdapter: Address;
  maturity: bigint;
  chainId: bigint;
  underlyingDecimals: number;
  createdAt: bigint;
  createdBlock: bigint;
  enabled: boolean;
  paused: boolean;
};

export type NativeMarketSnapshot = NativeMarketConfig & {
  id: Hex;
  active: boolean;
  source: {
    vault: Address;
    asset: Address;
    shareDecimals: number;
    sharesHeld: bigint;
    totalAssets: bigint;
    totalSupply: bigint;
    assetsPerShare: bigint;
  };
  currentSourceAssets: bigint;
  currentYieldAssets: bigint;
  underlyingYieldRate: null;
  nativeLiquidityAssets: null;
};

export type NativeIssuePreview = {
  ptAmount: bigint;
  ytAmount: bigint;
  sourceShares: bigint;
};

export type NativeRedemptionPreview = {
  assets: bigint;
  available: boolean;
};

export class YeltraNativeMarketAdapter {
  constructor(
    private readonly publicClient: PublicClient,
    readonly registryAddress: Address,
  ) {}

  async getMarketIds(): Promise<Hex[]> {
    const ids = await this.publicClient.readContract({
      address: this.registryAddress,
      abi: nativeRegistryAbi,
      functionName: "allMarketIds",
    });
    return [...ids];
  }

  async getMarket(id: Hex): Promise<NativeMarketSnapshot> {
    const [config, active] = await Promise.all([
      this.readConfig(id),
      this.publicClient.readContract({
        address: this.registryAddress,
        abi: nativeRegistryAbi,
        functionName: "isMarketActive",
        args: [id],
      }),
    ]);

    const [source, currentSourceAssets, currentYieldAssets] = await Promise.all([
      this.publicClient.multicall({
        contracts: [
          {
            address: config.sourceAdapter,
            abi: sourceAdapterAbi,
            functionName: "vault",
          },
          {
            address: config.sourceAdapter,
            abi: sourceAdapterAbi,
            functionName: "asset",
          },
          {
            address: config.sourceAdapter,
            abi: sourceAdapterAbi,
            functionName: "shareDecimals",
          },
          {
            address: config.sourceAdapter,
            abi: sourceAdapterAbi,
            functionName: "sharesHeld",
          },
          {
            address: config.sourceAdapter,
            abi: sourceAdapterAbi,
            functionName: "totalAssets",
          },
        ],
      }),
      this.readMarketValue(config.market, "currentSourceAssets"),
      this.readMarketValue(config.market, "currentYieldAssets"),
    ]);

    if (source.some((result) => result.status === "failure")) {
      throw new Error("YELTRA native source state is unavailable.");
    }

    const sourceVault = source[0].result as Address;
    const sourceVaultState = await this.publicClient.multicall({
      contracts: [
        {
          address: sourceVault,
          abi: sourceVaultAbi,
          functionName: "totalSupply",
        },
        {
          address: sourceVault,
          abi: sourceVaultAbi,
          functionName: "convertToAssets",
          args: [BigInt(10) ** BigInt(Number(source[2].result))],
        },
      ],
    });
    if (sourceVaultState.some((result) => result.status === "failure")) {
      throw new Error("YELTRA native source vault state is unavailable.");
    }

    return {
      ...config,
      id,
      active,
      source: {
        vault: sourceVault,
        asset: source[1].result as Address,
        shareDecimals: Number(source[2].result),
        sharesHeld: source[3].result as bigint,
        totalAssets: source[4].result as bigint,
        totalSupply: sourceVaultState[0].result as bigint,
        assetsPerShare: sourceVaultState[1].result as bigint,
      },
      currentSourceAssets,
      currentYieldAssets,
      underlyingYieldRate: null,
      nativeLiquidityAssets: null,
    };
  }

  async getMarkets(): Promise<NativeMarketSnapshot[]> {
    const ids = await this.getMarketIds();
    return Promise.all(ids.map((id) => this.getMarket(id)));
  }

  async previewIssue(market: Address, assets: bigint): Promise<NativeIssuePreview> {
    const result = await this.publicClient.readContract({
      address: market,
      abi: nativeMarketAbi,
      functionName: "previewIssue",
      args: [assets],
    });
    return {
      ptAmount: result[0],
      ytAmount: result[1],
      sourceShares: result[2],
    };
  }

  async previewRedemption(market: Address, ptAmount: bigint): Promise<NativeRedemptionPreview> {
    const result = await this.publicClient.readContract({
      address: market,
      abi: nativeMarketAbi,
      functionName: "previewRedemption",
      args: [ptAmount],
    });
    return { assets: result[0], available: result[1] };
  }

  async previewClaim(market: Address, owner: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: market,
      abi: nativeMarketAbi,
      functionName: "previewClaim",
      args: [owner],
    });
  }

  private async readConfig(id: Hex): Promise<NativeMarketConfig> {
    const config = await this.publicClient.readContract({
      address: this.registryAddress,
      abi: nativeRegistryAbi,
      functionName: "getMarket",
      args: [id],
    });
    return config as NativeMarketConfig;
  }

  private async readMarketValue(
    market: Address,
    functionName: "currentSourceAssets" | "currentYieldAssets",
  ): Promise<bigint> {
    return this.publicClient.readContract({
      address: market,
      abi: nativeMarketAbi,
      functionName,
    });
  }
}
