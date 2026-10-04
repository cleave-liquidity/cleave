export type BalanceShortcut = 0.25 | 0.5 | 1;

export type BalanceShortcutState = {
  inputAmount: string;
  selectedShortcut: BalanceShortcut | null;
};

export type WalletBalanceState = {
  isConnected: boolean;
  isLoading: boolean;
  error?: unknown;
  balance: number | null | undefined;
};

export function hasResolvedWalletBalance(state: WalletBalanceState): boolean {
  return Boolean(
    state.isConnected &&
      !state.isLoading &&
      !state.error &&
      typeof state.balance === "number" &&
      Number.isFinite(state.balance) &&
      state.balance > 0,
  );
}

/**
 * A shortfall is only real against a balance that was actually read. The balance hook falls back to 0 until
 * the first read lands (and when it fails), so without `hasBalance` every amount would look unaffordable.
 */
export function hasInsufficientBalance(state: {
  isConnected: boolean;
  hasBalance: boolean;
  error?: unknown;
  balance: number;
  amount: number;
}): boolean {
  return Boolean(
    state.isConnected &&
      state.hasBalance &&
      !state.error &&
      Number.isFinite(state.amount) &&
      state.amount > 0 &&
      state.amount > state.balance,
  );
}

export function applyBalanceShortcut(
  state: BalanceShortcutState,
  shortcut: BalanceShortcut,
  wallet: WalletBalanceState,
): BalanceShortcutState {
  if (!hasResolvedWalletBalance(wallet) || wallet.balance === undefined || wallet.balance === null) {
    return state;
  }

  return {
    inputAmount: (wallet.balance * shortcut).toFixed(2),
    selectedShortcut: shortcut,
  };
}

export function applyManualAmount(
  _state: BalanceShortcutState,
  inputAmount: string,
): BalanceShortcutState {
  return {
    inputAmount,
    selectedShortcut: null,
  };
}
