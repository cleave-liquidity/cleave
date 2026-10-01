export const queryKeys = {
  markets: ["markets"] as const,
  market: (marketId: string) => ["market", marketId] as const,
  positions: (address?: string) => ["positions", address?.toLowerCase() ?? "disconnected"] as const,
  balancePrefix: (address?: string) =>
    ["balance", address?.toLowerCase() ?? "disconnected"] as const,
  balance: (address: string | undefined, token: string) =>
    ["balance", address?.toLowerCase() ?? "disconnected", token] as const,
  fixedQuote: (marketId: string, inputAmount: number) =>
    ["fixed-quote", marketId, inputAmount] as const,
  longQuote: (marketId: string, inputAmount: number) =>
    ["long-quote", marketId, inputAmount] as const,
};
