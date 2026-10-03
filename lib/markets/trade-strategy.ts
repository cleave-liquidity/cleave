import type { TransactionState } from "@/types/transaction";

export type TradeStrategy = "fixed" | "long";

export function parseTradeStrategy(
  value: string | string[] | undefined,
): TradeStrategy | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "fixed" || candidate === "long" ? candidate : undefined;
}

export function buildTradeWorkspaceHref(
  marketId: string,
  strategy: TradeStrategy,
): string {
  return `/trade/${marketId}?strategy=${strategy}`;
}

export function isQuoteEnabledForStrategy(
  activeStrategy: TradeStrategy,
  quoteStrategy: TradeStrategy,
): boolean {
  return activeStrategy === quoteStrategy;
}

export function getTradeResetState(
  strategy: TradeStrategy,
  initialAmount?: string,
): {
  inputAmount: string;
  showAdvanced: false;
  transactionState: TransactionState;
} {
  return {
    inputAmount: initialAmount ?? (strategy === "long" ? "100" : "1000"),
    showAdvanced: false,
    transactionState: { step: "idle" },
  };
}
