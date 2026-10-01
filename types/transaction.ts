import { YieldErrorCode } from "./errors";

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
  errorCode?: YieldErrorCode;
  errorMessage?: string;
}
