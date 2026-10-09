import { YieldErrorCode } from "./errors";

export type TransactionHash = `0x${string}`;
export type TransactionStatus = "submitted" | "pending" | "confirmed" | "reverted";

export interface TransactionReceiptResult {
  hash: TransactionHash;
  chainId: number;
  status: TransactionStatus;
  blockNumber?: bigint;
  timestamp?: number;
}

export interface TokenApprovalRequest {
  tokenAddress: `0x${string}`;
  owner: `0x${string}`;
  spender: `0x${string}`;
  amount: bigint;
  chainId: number;
  /** Canonical live market ID used for YELTRA execution preflight. */
  marketId: string;
  onTransactionSubmitted?: (hash: TransactionHash) => void;
}

export type TransactionStep =
  | "idle"
  | "validating"
  | "approval-required"
  | "approving"
  | "approval-success"
  | "ready"
  | "confirming"
  | "pending"
  | "success"
  | "error";

export interface TransactionState {
  step: TransactionStep;
  txHash?: `0x${string}`;
  chainId?: number;
  receipt?: TransactionReceiptResult;
  errorCode?: YieldErrorCode;
  errorMessage?: string;
}
