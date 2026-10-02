import { YieldDomainError } from "@/types/errors";
import { formatUnits, isAddress, type PublicClient } from "viem";
import { normalizeYieldError } from "@/types/errors";
import { isSupportedRobinhoodChain, ROBINHOOD_NATIVE_DECIMALS } from "@/lib/web3/chains";
import type { RawBalanceSnapshot, TokenMetadata } from "@/types/token";

export interface BalanceAdapter {
  getTokenBalance(address: `0x${string}`, token: string): Promise<number>;
  getGasBalance(address: `0x${string}`): Promise<number>;
}

export interface OnchainBalanceAdapter {
  getNativeBalance(address: `0x${string}`, chainId: number): Promise<RawBalanceSnapshot>;
  getTokenBalance(metadata: TokenMetadata, owner: `0x${string}`): Promise<RawBalanceSnapshot>;
}

export const MOCK_TOKEN_BALANCE = 2_500;
export const MOCK_GAS_BALANCE = 0.01;
export const MOCK_NETWORK_FEE_ETH = 0.0004;

export class MockBalanceAdapter implements BalanceAdapter {
  async getTokenBalance(address: `0x${string}`, _token: string): Promise<number> {
    if (!address) {
      throw new YieldDomainError("wallet-disconnected", "Connect a wallet to read balances.");
    }
    return MOCK_TOKEN_BALANCE;
  }

  async getGasBalance(address: `0x${string}`): Promise<number> {
    if (!address) {
      throw new YieldDomainError("wallet-disconnected", "Connect a wallet to read gas balance.");
    }
    return MOCK_GAS_BALANCE;
  }
}

export class ViemBalanceAdapter implements OnchainBalanceAdapter {
  constructor(private readonly publicClient: PublicClient) {}

  private assertRequest(address: `0x${string}`, chainId: number): void {
    if (!isAddress(address)) {
      throw new YieldDomainError("wallet-disconnected", "The wallet address is invalid.");
    }
    if (!isSupportedRobinhoodChain(chainId)) {
      throw new YieldDomainError("wrong-network", "The selected network is not supported.");
    }
    if (this.publicClient.chain?.id && this.publicClient.chain.id !== chainId) {
      throw new YieldDomainError("wrong-network", "The RPC client is connected to a different network.");
    }
  }

  async getNativeBalance(address: `0x${string}`, chainId: number): Promise<RawBalanceSnapshot> {
    this.assertRequest(address, chainId);
    try {
      const raw = await this.publicClient.getBalance({ address });
      return {
        raw,
        decimals: ROBINHOOD_NATIVE_DECIMALS,
        formatted: formatUnits(raw, ROBINHOOD_NATIVE_DECIMALS),
        symbol: "ETH",
        chainId,
      };
    } catch (error) {
      throw normalizeYieldError(error);
    }
  }

  async getTokenBalance(metadata: TokenMetadata, owner: `0x${string}`): Promise<RawBalanceSnapshot> {
    this.assertRequest(owner, metadata.chainId);
    if (!isAddress(metadata.address) || !Number.isInteger(metadata.decimals) || metadata.decimals < 0 || metadata.decimals > 255) {
      throw new YieldDomainError("invalid-token-metadata", "Token metadata is invalid or unverified.");
    }

    try {
      const [raw, decimals, symbol] = await Promise.all([
        this.publicClient.readContract({
          address: metadata.address,
          abi: [
            {
              name: "balanceOf",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ name: "", type: "uint256" }],
            },
          ] as const,
          functionName: "balanceOf",
          args: [owner],
        }),
        this.publicClient.readContract({
          address: metadata.address,
          abi: [
            {
              name: "decimals",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ name: "", type: "uint8" }],
            },
          ] as const,
          functionName: "decimals",
        }),
        this.publicClient.readContract({
          address: metadata.address,
          abi: [
            {
              name: "symbol",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ name: "", type: "string" }],
            },
          ] as const,
          functionName: "symbol",
        }),
      ]);

      const resolvedDecimals = Number(decimals);
      if (!Number.isInteger(resolvedDecimals) || resolvedDecimals < 0 || resolvedDecimals > 255) {
        throw new YieldDomainError("invalid-token-metadata", "The token returned invalid decimals.");
      }

      return {
        raw,
        decimals: resolvedDecimals,
        formatted: formatUnits(raw, resolvedDecimals),
        symbol: typeof symbol === "string" ? symbol : metadata.symbol,
        chainId: metadata.chainId,
      };
    } catch (error) {
      throw normalizeYieldError(error);
    }
  }
}

export const balanceAdapter = new MockBalanceAdapter();
