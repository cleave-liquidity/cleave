export const queryKeys = {
  markets: (chainId?: number) => ["markets", chainId ?? "shared"] as const,
  market: (marketId: string, chainId?: number) => ["market", marketId, chainId ?? "shared"] as const,
  positions: (address?: string, chainId?: number) =>
    ["positions", address?.toLowerCase() ?? "disconnected", chainId ?? "unknown"] as const,
  balancePrefix: (address?: string, chainId?: number) =>
    ["balance", address?.toLowerCase() ?? "disconnected", chainId ?? "unknown"] as const,
  balance: (address: string | undefined, token: string, chainId?: number) =>
    ["balance", address?.toLowerCase() ?? "disconnected", token, chainId ?? "unknown"] as const,
  fixedQuote: (marketId: string, inputAmount: number, chainId?: number) =>
    ["fixed-quote", marketId, inputAmount, chainId ?? "unknown"] as const,
  longQuote: (marketId: string, inputAmount: number, chainId?: number) =>
    ["long-quote", marketId, inputAmount, chainId ?? "unknown"] as const,
};
