export type NativeBalanceStatus = "disconnected" | "loading" | "unavailable" | "resolved";

export type NativeBalanceInput = {
  isConnected: boolean;
  isLoading: boolean;
  hasBalance: boolean;
  balance: number | null;
  error?: unknown;
};

export function getNativeBalanceStatus(state: NativeBalanceInput): NativeBalanceStatus {
  if (!state.isConnected) return "disconnected";
  if (state.error || !state.hasBalance || typeof state.balance !== "number" || !Number.isFinite(state.balance)) {
    return state.isLoading && !state.hasBalance ? "loading" : "unavailable";
  }
  return "resolved";
}

/**
 * Disconnected wallets are handled by the wallet guard. Once connected, every
 * non-resolved state and a confirmed zero balance must stay away from writes.
 */
export function blocksExecutionForNativeBalance(state: NativeBalanceInput): boolean {
  if (!state.isConnected) return false;

  const status = getNativeBalanceStatus(state);
  return status !== "resolved" || (state.balance ?? 0) <= 0;
}
