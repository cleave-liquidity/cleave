import type { QuoteUiState } from "./quote-state";
import type { TransactionStep } from "@/types/transaction";

export type TradeActionKind =
  | "connect"
  | "switch-network"
  | "refresh-quote"
  | "write"
  | "success"
  | "disabled";

export type TradeBalanceState = "loading" | "unavailable" | "resolved";
export type TradeNativeBalanceState = "loading" | "unavailable" | "zero" | "resolved";
export type TradeAllowanceState = "loading" | "unavailable" | "required" | "sufficient";

export type TradeAction = {
  kind: TradeActionKind;
  label: string;
  disabled: boolean;
  busy?: boolean;
};

export type TradeActionInput = {
  strategy: "fixed" | "long";
  token: string;
  isConnected: boolean;
  isWrongNetwork: boolean;
  marketStatus: "active" | "maturing" | "paused" | "matured";
  hasValidAmount: boolean;
  quoteState: QuoteUiState;
  isQuoteExpired: boolean;
  quoteRefreshRequired: boolean;
  tokenBalanceState: TradeBalanceState;
  isTokenBalanceInsufficient: boolean;
  nativeBalanceState: TradeNativeBalanceState;
  allowanceState: TradeAllowanceState;
  transactionStep: TransactionStep;
};

function disabled(label: string, busy = false): TradeAction {
  return { kind: "disabled", label, disabled: true, busy };
}

export function getTradeActionState(input: TradeActionInput): TradeAction {
  const positionLabel = input.strategy === "fixed" ? "Fixed Yield" : "Trading Yield";

  if (input.transactionStep === "success") {
    return { kind: "success", label: "View Position", disabled: false };
  }

  if (input.transactionStep === "validating") return disabled("Checking Trade…", true);
  if (input.transactionStep === "approval-required") return disabled(`Approve ${input.token}`, true);
  if (input.transactionStep === "approving") return disabled(`Approving ${input.token}…`, true);
  if (input.transactionStep === "approval-success") return disabled("Approval Confirmed", true);
  if (input.transactionStep === "confirming") return disabled("Confirming...", true);
  if (input.transactionStep === "pending") return disabled("Transaction Pending...", true);

  if (input.marketStatus === "paused") return disabled("Market Paused");
  if (input.marketStatus === "matured") return disabled("Market Expired");

  if (input.quoteRefreshRequired || input.isQuoteExpired) {
    return { kind: "refresh-quote", label: "Refresh Quote", disabled: false };
  }

  if (input.quoteState === "unavailable" || input.quoteState === "error") {
    return { kind: "refresh-quote", label: "Quote Unavailable", disabled: false };
  }

  if (!input.isConnected) {
    return { kind: "connect", label: "Connect Wallet", disabled: false };
  }

  if (input.isWrongNetwork) {
    return { kind: "switch-network", label: "Switch to Robinhood Chain", disabled: false };
  }

  if (!input.hasValidAmount) return disabled("Enter an Amount");
  if (input.quoteState === "quoting") return disabled("Fetching Quote...");
  if (input.quoteState !== "ready") return disabled("Fetching Quote...");

  if (input.tokenBalanceState === "loading") return disabled(`Checking ${input.token} Balance…`);
  if (input.tokenBalanceState === "unavailable") return disabled("Balance Unavailable");
  if (input.isTokenBalanceInsufficient) return disabled(`Insufficient ${input.token} Balance`);

  if (input.nativeBalanceState === "loading") return disabled("Checking ETH for Gas…");
  if (input.nativeBalanceState === "unavailable") return disabled("Unable to Verify ETH for Gas");
  if (input.nativeBalanceState === "zero") return disabled("Insufficient ETH for Gas");

  if (input.allowanceState === "loading") return disabled("Checking Allowance…");
  if (input.allowanceState === "unavailable") return disabled("Unable to Verify Allowance");
  if (input.allowanceState === "required") return { kind: "write", label: `Approve ${input.token}`, disabled: false };

  return { kind: "write", label: `Open ${positionLabel}`, disabled: false };
}
