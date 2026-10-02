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
  | "live-integration-not-configured"
  | "live-source-unavailable"
  | "unsupported-operation"
  | "invalid-token-metadata"
  | "transaction-not-found"
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
  LIVE_INTEGRATION_NOT_CONFIGURED: "live-integration-not-configured",
  LIVE_SOURCE_UNAVAILABLE: "live-source-unavailable",
  UNSUPPORTED_OPERATION: "unsupported-operation",
  INVALID_TOKEN_METADATA: "invalid-token-metadata",
  TRANSACTION_NOT_FOUND: "transaction-not-found",
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

type UnknownErrorRecord = {
  name?: unknown;
  message?: unknown;
  shortMessage?: unknown;
  code?: unknown;
  cause?: unknown;
};

function errorRecords(error: unknown): UnknownErrorRecord[] {
  const records: UnknownErrorRecord[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const record = current as UnknownErrorRecord;
    records.push(record);
    current = record.cause;
  }
  return records;
}

export function normalizeYieldError(error: unknown): YieldDomainError {
  if (isYieldDomainError(error)) return error;

  const records = errorRecords(error);
  const names = records
    .map((record) => (typeof record.name === "string" ? record.name : ""))
    .join(" ")
    .toLowerCase();
  const messages = records
    .flatMap((record) => [record.message, record.shortMessage])
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  const codes = records.map((record) => record.code);

  if (names.includes("userrejectedrequest") || names.includes("transactionrejected") || codes.includes(4001)) {
    return new YieldDomainError(
      "transaction-rejected",
      "The wallet rejected the transaction.",
    );
  }
  if (names.includes("switchchain") || names.includes("unsupportedchain")) {
    return new YieldDomainError(
      "network-switch-failed",
      "The wallet could not switch networks. Select Robinhood Chain manually and try again.",
    );
  }
  if (codes.includes(4901) || messages.includes("wrong network") || messages.includes("chain mismatch")) {
    return new YieldDomainError(
      "wrong-network",
      "Switch your wallet to the selected Robinhood Chain network.",
    );
  }
  if (names.includes("insufficientfunds") || messages.includes("insufficient funds") || messages.includes("insufficient balance")) {
    return new YieldDomainError(
      "insufficient-eth-for-gas",
      "Your wallet does not have enough ETH to pay the network fee.",
    );
  }
  if (
    names.includes("reverted") ||
    names.includes("executionerror") ||
    messages.includes("execution reverted") ||
    messages.includes("contract reverted")
  ) {
    return new YieldDomainError(
      "transaction-reverted",
      "The transaction was reverted by the network or contract.",
    );
  }
  if (
    names.includes("httprequest") ||
    names.includes("rpcrequest") ||
    names.includes("timeouterror") ||
    names.includes("providerdisconnected") ||
    messages.includes("timeout") ||
    messages.includes("rate limit") ||
    messages.includes("network request")
  ) {
    return new YieldDomainError(
      "rpc-unavailable",
      "The network request could not be completed. Please try again.",
    );
  }

  return new YieldDomainError(
    "rpc-unavailable",
    "The request could not be completed. Please try again.",
  );
}

export function getYieldErrorMessage(error: unknown): string {
  return normalizeYieldError(error).message;
}
