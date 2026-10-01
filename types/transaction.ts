export type TransactionStep =
  | "idle"
  | "validation"
  | "approval_pending"
  | "approval_success"
  | "transaction_pending"
  | "transaction_success"
  | "error";

export interface TransactionState {
  step: TransactionStep;
  txHash?: `0x${string}`;
  errorMessage?: string;
}
