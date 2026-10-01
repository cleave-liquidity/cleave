export type YieldErrorCode =
  | "wallet-unavailable"
  | "wallet-disconnected"
  | "wrong-network"
  | "network-switch-failed"
  | "invalid-amount"
  | "insufficient-token-balance"
  | "insufficient-eth-for-gas"
  | "approval-required"
  | "approval-pending"
  | "approval-rejected"
  | "transaction-rejected"
  | "transaction-reverted"
  | "rpc-unavailable"
  | "quote-expired"
  | "market-paused"
  | "market-expired"
  | "insufficient-liquidity"
  | "nothing-claimable"
  | "pt-not-redeemable"
  | "pt-already-redeemed"
  | "position-not-found"
  | "position-owner-mismatch"
  | "position-not-sellable"
  | "position-closed"
  | "market-not-found";

export const YIELD_ERROR_CODES = {
  WALLET_DISCONNECTED: "wallet-disconnected",
  WALLET_UNAVAILABLE: "wallet-unavailable",
  WRONG_NETWORK: "wrong-network",
  NETWORK_SWITCH_FAILED: "network-switch-failed",
  INVALID_AMOUNT: "invalid-amount",
  INSUFFICIENT_BALANCE: "insufficient-token-balance",
  INSUFFICIENT_GAS: "insufficient-eth-for-gas",
  APPROVAL_REQUIRED: "approval-required",
  APPROVAL_REJECTED: "approval-rejected",
  TRANSACTION_REJECTED: "transaction-rejected",
  TRANSACTION_REVERTED: "transaction-reverted",
  RPC_UNAVAILABLE: "rpc-unavailable",
  QUOTE_EXPIRED: "quote-expired",
  MARKET_PAUSED: "market-paused",
  MARKET_MATURED: "market-expired",
  MARKET_NOT_FOUND: "market-not-found",
  INSUFFICIENT_LIQUIDITY: "insufficient-liquidity",
  NOTHING_TO_CLAIM: "nothing-claimable",
  POSITION_NOT_FOUND: "position-not-found",
  POSITION_OWNER_MISMATCH: "position-owner-mismatch",
  POSITION_NOT_SELLABLE: "position-not-sellable",
  POSITION_CLOSED: "position-closed",
  POSITION_ALREADY_CLOSED: "position-closed",
  PT_NOT_REDEEMABLE: "pt-not-redeemable",
  PT_ALREADY_REDEEMED: "pt-already-redeemed",
} as const satisfies Record<string, YieldErrorCode>;

export class YieldDomainError extends Error {
  readonly code: YieldErrorCode;

  constructor(code: YieldErrorCode, message: string) {
    super(message);
    this.name = "YieldDomainError";
    this.code = code;
  }
}

export function isYieldDomainError(error: unknown): error is YieldDomainError {
  return error instanceof YieldDomainError;
}

export function getYieldErrorMessage(error: unknown): string {
  if (isYieldDomainError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
