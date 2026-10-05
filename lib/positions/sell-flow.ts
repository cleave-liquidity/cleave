import { isAddress, isHex } from "viem";
import type { ExitQuote } from "@/types/quote";

export type SellFlowStep =
  | "idle"
  | "quoting"
  | "review"
  | "ready"
  | "approving"
  | "confirming"
  | "pending"
  | "success"
  | "error";

export function isSellFlowBusy(step: SellFlowStep): boolean {
  return step === "quoting" || step === "approving" || step === "confirming" || step === "pending";
}

export function getSellFlowActionLabel(step: SellFlowStep): string {
  switch (step) {
    case "quoting":
      return "Fetching Exit Quote…";
    case "approving":
      return "Approving PT…";
    case "confirming":
      return "Confirm Sell Early…";
    case "pending":
      return "Transaction Pending…";
    case "success":
      return "Position Sold";
    case "ready":
      return "Sell Early";
    case "error":
      return "Continue";
    default:
      return "Continue";
  }
}

export const EXIT_TRANSACTION_UNAVAILABLE_MESSAGE =
  "Exit transaction is unavailable. Refresh the quote and try again.";

export function isExecutableExitQuote(quote?: Pick<ExitQuote, "transaction">): boolean {
  const transaction = quote?.transaction;
  const data = transaction?.data;
  return Boolean(
    transaction &&
      isAddress(transaction.to) &&
      typeof data === "string" &&
      isHex(data) &&
      data.length > 2 &&
      (data.length - 2) % 2 === 0 &&
      typeof transaction.value === "bigint" &&
      transaction.value >= BigInt(0),
  );
}

export function getSellQuoteContext(
  address?: string,
  chainId?: number,
  positionChainId?: number,
): string {
  return `${address?.toLowerCase() ?? "disconnected"}:${chainId ?? "unknown"}:${positionChainId ?? "unknown"}`;
}

export function hasSellQuoteContextChanged(previous: string, current: string): boolean {
  return previous !== current;
}

export function requiresSellApproval(
  quote: Pick<ExitQuote, "approvalToken" | "approvalAmount"> | undefined,
  allowance: bigint | null,
  approvalConfirmed: boolean,
): boolean {
  return Boolean(
    quote?.approvalToken &&
      quote.approvalAmount &&
      quote.approvalAmount > BigInt(0) &&
      !approvalConfirmed &&
      (allowance === null || allowance < quote.approvalAmount),
  );
}
