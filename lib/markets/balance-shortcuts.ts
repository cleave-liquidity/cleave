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
      state.balance >= 0,
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
