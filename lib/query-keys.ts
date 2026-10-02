import { getConfiguredDataMode } from "@/lib/adapters/config";

const dataMode = () => getConfiguredDataMode();

export const queryKeys = {
  markets: (chainId?: number) => ["markets", dataMode(), chainId ?? "shared"] as const,
  market: (marketId: string, chainId?: number) => ["market", dataMode(), marketId, chainId ?? "shared"] as const,
  positions: (address?: string, chainId?: number) =>
    ["positions", dataMode(), address?.toLowerCase() ?? "disconnected", chainId ?? "unknown"] as const,
  balancePrefix: (address?: string, chainId?: number) =>
    ["balance", dataMode(), address?.toLowerCase() ?? "disconnected", chainId ?? "unknown"] as const,
  balance: (address: string | undefined, token: string, chainId?: number) =>
    ["balance", dataMode(), address?.toLowerCase() ?? "disconnected", token, chainId ?? "unknown"] as const,
  fixedQuote: (marketId: string, inputAmount: number, chainId?: number) =>
    ["fixed-quote", dataMode(), marketId, inputAmount, chainId ?? "unknown"] as const,
  longQuote: (marketId: string, inputAmount: number, chainId?: number) =>
    ["long-quote", dataMode(), marketId, inputAmount, chainId ?? "unknown"] as const,
};
