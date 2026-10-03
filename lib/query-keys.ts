import { getConfiguredDataMode } from "@/lib/adapters/config";

const dataMode = () => getConfiguredDataMode();
const adapter = () => (getConfiguredDataMode() === "live" ? "pendle-live" : "mock");

export const queryKeys = {
  markets: (chainId?: number) => ["markets", dataMode(), adapter(), chainId ?? "shared"] as const,
  market: (marketId: string, chainId?: number) => ["market", dataMode(), adapter(), marketId, chainId ?? "shared"] as const,
  positions: (address?: string, chainId?: number) =>
    ["positions", dataMode(), adapter(), address?.toLowerCase() ?? "disconnected", chainId ?? "unknown"] as const,
  balancePrefix: (address?: string, chainId?: number) =>
    ["balance", dataMode(), adapter(), address?.toLowerCase() ?? "disconnected", chainId ?? "unknown"] as const,
  balance: (address: string | undefined, token: string, chainId?: number) =>
    ["balance", dataMode(), adapter(), address?.toLowerCase() ?? "disconnected", token, chainId ?? "unknown"] as const,
  allowancePrefix: (address?: string, chainId?: number) =>
    ["allowance", dataMode(), adapter(), address?.toLowerCase() ?? "disconnected", chainId ?? "unknown"] as const,
  allowance: (address: string | undefined, token: string, spender: string, chainId?: number) =>
    ["allowance", dataMode(), adapter(), address?.toLowerCase() ?? "disconnected", token.toLowerCase(), spender.toLowerCase(), chainId ?? "unknown"] as const,
  fixedQuote: (marketId: string, inputAmount: number, chainId?: number) =>
    ["fixed-quote", dataMode(), adapter(), marketId, inputAmount, chainId ?? "unknown"] as const,
  longQuote: (marketId: string, inputAmount: number, chainId?: number) =>
    ["long-quote", dataMode(), adapter(), marketId, inputAmount, chainId ?? "unknown"] as const,
};
