"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { YieldMarket } from "@/types/market";
import type { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import { useFixedYieldQuote } from "@/hooks/useFixedYieldQuote";
import { useLongYieldQuote } from "@/hooks/useLongYieldQuote";
import { useNetworkGuard } from "@/hooks/useNetworkGuard";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useNativeBalance } from "@/hooks/useNativeBalance";
import { useTokenAllowance } from "@/hooks/useTokenAllowance";
import { useApproveToken } from "@/hooks/useApproveToken";
import { useOpenFixedPosition } from "@/hooks/useOpenFixedPosition";
import { useOpenLongPosition } from "@/hooks/useOpenLongPosition";
import { formatApy, formatNativeBalance, formatNetworkFee, formatPriceImpact, formatTokenAmount } from "@/lib/utils/formatters";
import { toast } from "sonner";
import { TransactionState, type TransactionHash } from "@/types/transaction";
import { YieldDomainError, getYieldErrorMessage, normalizeYieldError } from "@/types/errors";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { getContractByName } from "@/lib/contracts/deployments";
import { getMarketStatus, isMarketTradable } from "@/lib/markets/status";
import {
  getTradeResetState,
  isQuoteEnabledForStrategy,
  type TradeStrategy,
} from "@/lib/markets/trade-strategy";
import {
  getQuoteTechnicalMessage,
  getQuoteUiState,
  getQuoteUserMessage,
  isQuoteExecutionReady,
  isQuoteRouteUnavailableError,
  QUOTE_UNAVAILABLE_TITLE,
  type QuoteUiState,
} from "@/lib/markets/quote-state";
import { blocksExecutionForNativeBalance } from "@/lib/markets/native-balance";
import { getTradeActionState } from "@/lib/markets/trade-action-state";
import {
  applyBalanceShortcut,
  applyManualAmount,
  hasInsufficientBalance,
  hasResolvedWalletBalance,
  type BalanceShortcut,
} from "@/lib/markets/balance-shortcuts";

export type TradeQuoteContext = {
  marketId: string;
  inputAmount: number | null;
  quoteState: QuoteUiState;
  fixedQuote: FixedYieldQuote | null;
  longQuote: LongYieldQuote | null;
};

export function TradePanel({
  market,
  strategy,
  initialAmount,
  onQuoteContextChange,
}: {
  market: YieldMarket;
  strategy: TradeStrategy;
  initialAmount?: string;
  onQuoteContextChange?: (context: TradeQuoteContext) => void;
}) {
  const router = useRouter();
  const { address, chainId, isConnected, status: networkStatus, switchToRobinhood } = useNetworkGuard();
  const { balance, hasBalance, isLoading: balanceLoading, error: balanceError } = useTokenBalance(
    address,
    market.quoteAsset,
    market.underlyingTokenAddress,
    market.underlyingDecimals,
    market.chainId,
  );
  const nativeBalance = useNativeBalance(address, market.chainId);
  const nativeBalanceState = {
    isConnected,
    isLoading: nativeBalance.isLoading,
    hasBalance: nativeBalance.hasBalance,
    balance: nativeBalance.balance,
    error: nativeBalance.error,
  };
  const isNativeBalanceBlocking = blocksExecutionForNativeBalance(nativeBalanceState);
  const approvalSpender = getContractByName(market.chainId, "Pendle Router V2")?.address;
  const { allowance, isLoading: allowanceLoading, error: allowanceError, refresh: refreshAllowance } = useTokenAllowance(
    address,
    market.underlyingTokenAddress,
    approvalSpender,
    market.chainId,
  );
  const approveToken = useApproveToken();
  const openFixedPosition = useOpenFixedPosition();
  const openLongPosition = useOpenLongPosition();
  const { openConnectModal } = useConnectModal();

  const initialTradeState = getTradeResetState(strategy, initialAmount);
  const [inputAmountStr, setInputAmountStr] = useState<string>(initialTradeState.inputAmount);
  const [txState, setTxState] = useState<TransactionState>(initialTradeState.transactionState);
  const [confirmedApprovalHash, setConfirmedApprovalHash] = useState<TransactionHash | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedShortcut, setSelectedShortcut] = useState<BalanceShortcut | null>(null);
  const [quoteRefreshRequired, setQuoteRefreshRequired] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const resetState = getTradeResetState(strategy, initialAmount);
    setInputAmountStr(resetState.inputAmount);
    setShowAdvanced(resetState.showAdvanced);
    setTxState(resetState.transactionState);
    setConfirmedApprovalHash(null);
    setSelectedShortcut(null);
    setQuoteRefreshRequired(false);
  }, [strategy, initialAmount]);

  useEffect(() => {
    setSelectedShortcut(null);
    setTxState({ step: "idle" });
    setQuoteRefreshRequired(false);
  }, [market.chainId, market.id, market.quoteAsset, market.underlyingTokenAddress]);

  const inputAmount = Number(inputAmountStr);
  const hasNumericAmount = inputAmountStr.trim() !== "" && Number.isFinite(inputAmount);

  const { quote: fixedQuote, isLoading: loadingFixed, error: fixedQuoteError, refresh: refreshFixed } = useFixedYieldQuote(
    market.id,
    inputAmount,
    { enabled: isQuoteEnabledForStrategy(strategy, "fixed") },
  );
  const { quote: longQuote, isLoading: loadingLong, error: longQuoteError, refresh: refreshLong } = useLongYieldQuote(
    market.id,
    inputAmount,
    { enabled: isQuoteEnabledForStrategy(strategy, "long") },
  );

  const isFixed = strategy === "fixed";
  const isWrongNetwork =
    networkStatus === "unsupported-chain" ||
    (isConnected && chainId !== market.chainId);
  const isInvalidAmount = !hasNumericAmount || inputAmount <= 0;
  // Only flag a shortfall against a balance that was really read; before it loads (or if the read fails) the
  // balance falls back to 0, which would otherwise show "Insufficient balance" for any amount.
  const isInsufficientBalance = hasInsufficientBalance({
    isConnected,
    hasBalance,
    error: balanceError,
    balance,
    amount: inputAmount,
  });
  const canUseBalanceShortcuts = hasResolvedWalletBalance({
    isConnected,
    isLoading: balanceLoading,
    error: balanceError,
    balance,
  });
  const hasResolvedTokenBalance = Boolean(
    isConnected &&
      hasBalance &&
      !balanceError &&
      Number.isFinite(balance),
  );
  const isTokenBalanceLoading = Boolean(isConnected && balanceLoading && !hasBalance);
  const isTokenBalanceUnavailable = Boolean(
    isConnected &&
      !hasResolvedTokenBalance &&
      !isTokenBalanceLoading,
  );

  useEffect(() => {
    if (!canUseBalanceShortcuts) setSelectedShortcut(null);
  }, [canUseBalanceShortcuts]);

  const marketStatus = getMarketStatus(market);
  const isMarketUnavailable = !isMarketTradable(market);
  const activeQuote = isFixed ? fixedQuote : longQuote;
  const quoteError = isFixed ? fixedQuoteError : longQuoteError;
  const activeQuoteLoading = isFixed ? loadingFixed : loadingLong;
  const isQuoteExpired = Boolean(activeQuote && activeQuote.quoteExpiry <= currentTime);
  const quoteState = getQuoteUiState({
    hasValidAmount: !isInvalidAmount,
    isLoading: activeQuoteLoading,
    quote: activeQuote,
    error: quoteError,
    isExpired: isQuoteExpired,
  });
  const isQuoteReady = isQuoteExecutionReady(quoteState);
  const quoteForExecution = isQuoteReady ? activeQuote : null;
  const fixedQuoteForDisplay = isQuoteReady ? fixedQuote : null;
  const longQuoteForDisplay = isQuoteReady ? longQuote : null;
  const hasVerifiedApprovalData = Boolean(
    quoteForExecution?.approvalToken &&
      quoteForExecution.approvalAmount &&
      market.underlyingTokenAddress &&
      quoteForExecution.approvalToken.toLowerCase() === market.underlyingTokenAddress.toLowerCase(),
  );
  const requiredApprovalAmount = quoteForExecution?.approvalAmount;

  useEffect(() => {
    onQuoteContextChange?.({
      marketId: market.id,
      inputAmount: isInvalidAmount ? null : inputAmount,
      quoteState,
      fixedQuote: fixedQuoteForDisplay,
      longQuote: longQuoteForDisplay,
    });
  }, [
    fixedQuoteForDisplay,
    inputAmount,
    isInvalidAmount,
    longQuoteForDisplay,
    market.id,
    onQuoteContextChange,
    quoteState,
  ]);

  const isApprovalRequired = Boolean(
    yieldAdapter.mode === "live" &&
      isQuoteReady &&
      isConnected &&
      hasVerifiedApprovalData &&
      allowance !== null &&
      requiredApprovalAmount !== undefined &&
      allowance < requiredApprovalAmount,
  );
  const isAllowanceLoading = Boolean(
    yieldAdapter.mode === "live" &&
      isQuoteReady &&
      isConnected &&
      hasVerifiedApprovalData &&
      approvalSpender &&
      allowance === null &&
      allowanceLoading &&
      !allowanceError,
  );
  const isAllowanceUnavailable = Boolean(
    yieldAdapter.mode === "live" &&
      isQuoteReady &&
      isConnected &&
      !isAllowanceLoading &&
      (!hasVerifiedApprovalData || !approvalSpender || allowance === null || allowanceError),
  );
  const isNativeBalanceLoading = isConnected && nativeBalance.status === "loading";
  const isNativeBalanceUnavailable = isConnected && nativeBalance.status === "unavailable";
  const isNativeBalanceZero = isConnected && nativeBalance.status === "resolved" && nativeBalance.balance === 0;

  const formatScenarioChange = (change: number) =>
    `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

  const handleConnectWallet = () => {
    if (openConnectModal) {
      openConnectModal();
      return;
    }
    const error = new YieldDomainError(
      "wallet-unavailable",
      "No wallet connection modal is available in this environment.",
    );
    setTxState({ step: "error", errorCode: error.code, errorMessage: error.message });
    toast.error(error.message);
  };

  const handlePreset = (shortcut: BalanceShortcut) => {
    const next = applyBalanceShortcut(
      { inputAmount: inputAmountStr, selectedShortcut },
      shortcut,
      {
        isConnected,
        isLoading: balanceLoading,
        error: balanceError,
        balance,
      },
    );
    setInputAmountStr(next.inputAmount);
    setSelectedShortcut(next.selectedShortcut);
  };

  const handleManualAmountChange = (value: string) => {
    const next = applyManualAmount(
      { inputAmount: inputAmountStr, selectedShortcut },
      value,
    );
    setInputAmountStr(next.inputAmount);
    setSelectedShortcut(next.selectedShortcut);
  };

  const handleNetworkSwitch = async () => {
    try {
      setTxState({ step: "validating" });
      await switchToRobinhood(market.chainId);
      setTxState({ step: "ready" });
    } catch {
      const error = new YieldDomainError(
        "network-switch-failed",
        "Network switch failed. Select Robinhood Chain in your wallet and try again."
      );
      setTxState({ step: "error", errorCode: error.code, errorMessage: error.message });
      toast.error(error.message);
    }
  };

  const handleRefreshQuote = async () => {
    try {
      const result = isFixed ? await refreshFixed() : await refreshLong();
      if (result.error) {
        toast.error(getQuoteUserMessage(result.error));
        return;
      }
      setQuoteRefreshRequired(false);
      setTxState({ step: "idle" });
      toast.success("Quote refreshed");
    } catch (error: unknown) {
      toast.error(getQuoteUserMessage(error));
    }
  };

  const handleExecuteTrade = async () => {
    if (["validating", "approval-required", "approving", "approval-success", "confirming", "pending", "success"].includes(txState.step)) {
      return;
    }

    if (!isConnected) {
      handleConnectWallet();
      return;
    }

    if (isWrongNetwork) {
      await handleNetworkSwitch();
      return;
    }

    // A reset scheduled by the previous attempt must not wipe the state of this one.
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);

    let submittedTransactionHash: TransactionHash | undefined;
    try {
      setTxState({ step: "validating" });

      if (isInvalidAmount) {
        throw new YieldDomainError("invalid-amount", "Enter an amount greater than zero.");
      }
      if (isTokenBalanceLoading) {
        throw new YieldDomainError("rpc-unavailable", `Checking ${market.quoteAsset} balance. Try again when it is available.`);
      }
      if (isTokenBalanceUnavailable) {
        throw new YieldDomainError("rpc-unavailable", `Unable to verify your ${market.quoteAsset} balance.`);
      }
      if (isInsufficientBalance) {
        throw new YieldDomainError(
          "insufficient-token-balance",
          `Insufficient ${market.quoteAsset} balance for this trade.`
        );
      }
      if (isNativeBalanceBlocking) {
        if (nativeBalance.status === "resolved" && nativeBalance.balance === 0) {
          throw new YieldDomainError("insufficient-eth-for-gas", "Insufficient ETH for network fees.");
        }
        throw new YieldDomainError("rpc-unavailable", "Unable to verify ETH for network fees.");
      }
      if (isMarketUnavailable) {
        throw new YieldDomainError(
          marketStatus === "paused" ? "market-paused" : "market-expired",
          marketStatus === "paused"
            ? "This market is currently paused."
            : "This market has passed maturity."
        );
      }
      if (!isQuoteReady || !quoteForExecution) {
        throw new YieldDomainError(
          "quote-expired",
          "This quote is unavailable. Wait for a fresh quote and try again."
        );
      }
      if (isQuoteExpired) {
        throw new YieldDomainError(
          "quote-expired",
          "This quote has expired. Refresh the quote before confirming."
        );
      }
      if (!address || !chainId) {
        throw new YieldDomainError("wallet-disconnected", "Connect a wallet to continue.");
      }

      if (isAllowanceLoading) {
        throw new YieldDomainError("rpc-unavailable", "Checking token allowance. Try again when it is available.");
      }
      if (isAllowanceUnavailable) {
        throw new YieldDomainError("live-source-unavailable", "Unable to verify the token allowance for this quote.");
      }

      if (isApprovalRequired) {
        if (
          !approvalSpender ||
          !quoteForExecution.approvalToken ||
          !quoteForExecution.approvalAmount ||
          !market.underlyingTokenAddress ||
          quoteForExecution.approvalToken.toLowerCase() !== market.underlyingTokenAddress.toLowerCase()
        ) {
          throw new YieldDomainError("live-source-unavailable", "The live quote did not include verified approval data.");
        }
        setTxState({ step: "approval-required" });
        setTxState({ step: "approving" });
        const approval = await approveToken.mutateAsync({
          tokenAddress: quoteForExecution.approvalToken,
          owner: address,
          spender: approvalSpender,
          amount: quoteForExecution.approvalAmount,
          chainId: market.chainId,
          marketId: market.id,
          onTransactionSubmitted: (hash) => {
            submittedTransactionHash = hash;
            setTxState({ step: "pending", txHash: hash, chainId: market.chainId });
          },
        });
        submittedTransactionHash = undefined;
        setConfirmedApprovalHash(approval.txHash);
        await refreshAllowance();
        setTxState({ step: "approval-success" });
        toast.success(`${market.quoteAsset} approval granted`);
        return;
      }

      if (yieldAdapter.mode === "mock") {
        setTxState({ step: "approval-required" });
        await new Promise((resolve) => setTimeout(resolve, 900));
        setTxState({ step: "approving" });
        await new Promise((resolve) => setTimeout(resolve, 900));
        setTxState({ step: "approval-success" });
        toast.success(`${market.quoteAsset} approval granted`);
        setTxState({ step: "ready" });
        setTxState({ step: "confirming" });
        await new Promise((resolve) => setTimeout(resolve, 1400));
      } else {
        // The live adapter checks the verified spender, approves only the required
        // amount, waits for that receipt, and then submits the route transaction.
        setTxState({ step: "confirming" });
      }

      if (isFixed) {
        const openedPosition = await openFixedPosition.mutateAsync({
          marketId: market.id,
          inputAmount,
          userAddress: address,
          quote: fixedQuote!,
          chainId,
          quoteAsset: market.quoteAsset,
          onTransactionSubmitted: (hash) => {
            submittedTransactionHash = hash;
            setTxState({ step: "pending", txHash: hash, chainId: market.chainId });
          },
        });
        if (yieldAdapter.mode === "live" && !openedPosition.txHash) {
          throw new YieldDomainError("rpc-unavailable", "The position call completed without a confirmed on-chain transaction hash.");
        }
        setTxState({ step: "success", txHash: openedPosition.txHash, chainId: market.chainId });
        toast.success(yieldAdapter.mode === "live"
          ? `Fixed Yield confirmed on Robinhood Chain for ${inputAmount} ${market.quoteAsset}.`
          : "Preview position added locally. No blockchain transaction was sent.");
      } else {
        const openedPosition = await openLongPosition.mutateAsync({
          marketId: market.id,
          inputAmount,
          userAddress: address,
          quote: longQuote!,
          chainId,
          quoteAsset: market.quoteAsset,
          onTransactionSubmitted: (hash) => {
            submittedTransactionHash = hash;
            setTxState({ step: "pending", txHash: hash, chainId: market.chainId });
          },
        });
        if (yieldAdapter.mode === "live" && !openedPosition.txHash) {
          throw new YieldDomainError("rpc-unavailable", "The position call completed without a confirmed on-chain transaction hash.");
        }
        setTxState({ step: "success", txHash: openedPosition.txHash, chainId: market.chainId });
        toast.success(yieldAdapter.mode === "live"
          ? `Trading Yield confirmed on Robinhood Chain for ${inputAmount} ${market.quoteAsset}.`
          : "Preview position added locally. No blockchain transaction was sent.");
      }
    } catch (err: unknown) {
      const normalizedError = err instanceof YieldDomainError ? err : normalizeYieldError(err);
      if (submittedTransactionHash) {
        const message = "Transaction submitted, but its receipt could not be verified. Check Blockscout before retrying.";
        setTxState({
          step: "pending",
          txHash: submittedTransactionHash,
          chainId: market.chainId,
          errorMessage: message,
        });
        toast.error(message);
        return;
      }
      const message = isQuoteRouteUnavailableError(err)
        ? getQuoteUserMessage(err)
        : normalizedError.message || getYieldErrorMessage(err);
      if (normalizedError.code === "transaction-reverted") {
        setQuoteRefreshRequired(true);
      }
      setTxState({
        step: "error",
        errorCode: normalizedError.code,
        errorMessage: message,
      });
      toast.error(message);
    } finally {
      // Restore the actionable CTA after a result, while keeping successful positions visible.
      resetTimerRef.current = window.setTimeout(() => {
        setTxState((current) => (
          current.step === "error" || current.step === "approval-success"
            ? { step: "idle" }
            : current
        ));
      }, 3000);
    }
  };

  const tokenBalanceActionState = isTokenBalanceLoading
    ? "loading"
    : isTokenBalanceUnavailable
      ? "unavailable"
      : "resolved";
  const nativeBalanceActionState = isNativeBalanceLoading
    ? "loading"
    : isNativeBalanceUnavailable
      ? "unavailable"
      : isNativeBalanceZero
        ? "zero"
        : "resolved";
  const allowanceActionState = isAllowanceLoading
    ? "loading"
    : isAllowanceUnavailable
      ? "unavailable"
      : isApprovalRequired
        ? "required"
        : "sufficient";
  const primaryAction = getTradeActionState({
    strategy,
    token: market.quoteAsset,
    isConnected,
    isWrongNetwork,
    marketStatus,
    hasValidAmount: !isInvalidAmount,
    quoteState,
    isQuoteExpired,
    quoteRefreshRequired,
    tokenBalanceState: tokenBalanceActionState,
    isTokenBalanceInsufficient: isInsufficientBalance,
    nativeBalanceState: nativeBalanceActionState,
    allowanceState: allowanceActionState,
    transactionStep: txState.step,
  });
  const displayedPrimaryAction = yieldAdapter.mode === "mock" && primaryAction.kind === "success"
    ? { ...primaryAction, label: "View Preview Position" }
    : primaryAction;
  const handlePrimaryAction = () => {
    if (displayedPrimaryAction.kind === "connect") {
      handleConnectWallet();
    } else if (displayedPrimaryAction.kind === "switch-network") {
      void handleNetworkSwitch();
    } else if (displayedPrimaryAction.kind === "refresh-quote") {
      void handleRefreshQuote();
    } else if (displayedPrimaryAction.kind === "success") {
      router.push("/portfolio");
    } else if (displayedPrimaryAction.kind === "write") {
      void handleExecuteTrade();
    }
  };

  return (
    <div className="border border-white/15 rounded-[10px] bg-surface p-5 sm:p-7 flex flex-col gap-5">
      {/* Panel Header */}
      <div className="flex justify-between items-center pb-2 border-b border-white/10">
        <span className="mono text-[13px] tracking-wider text-muted-dark uppercase">
          {isFixed ? "Open Fixed Yield" : "Open Trading Yield"}
        </span>
      </div>

      {/* Amount Input */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[13px] text-muted-dark">
          <label htmlFor="trade-amount">You pay</label>
          <div className="flex items-center gap-2 mono text-[12px]">
            <span>
              BALANCE: {!isConnected
                ? "—"
                : balanceLoading && !hasBalance
                  ? "Loading…"
                  : balanceError || !hasBalance
                    ? "Unavailable"
                    : formatTokenAmount(balance)}
            </span>
            <span className="text-muted-faint">{market.quoteAsset}</span>
            <span className="text-muted-faint">
              GAS: {!isConnected
                ? "—"
                : nativeBalance.status === "loading"
                  ? "Loading…"
                  : nativeBalance.status === "unavailable"
                  ? "Unavailable"
                    : `${formatNativeBalance(nativeBalance.balance ?? 0)} ETH`
              }
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border border-white/20 rounded-lg bg-surface-raised px-4 min-h-[58px] focus-within:border-white/35 transition-colors">
          <input
            id="trade-amount"
            type="number"
            min="0"
            step="any"
            value={inputAmountStr}
            onChange={(e) => handleManualAmountChange(e.target.value)}
            className="mono flex-grow min-w-0 bg-transparent border-0 text-foreground text-[24px] outline-none"
            placeholder="0.00"
          />
          <span className="text-[15px] font-medium text-muted">
            {market.quoteAsset}
          </span>
        </div>

        {/* Quick Amount Presets */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => handlePreset(0.25)}
            disabled={!canUseBalanceShortcuts}
            aria-pressed={selectedShortcut === 0.25 && canUseBalanceShortcuts}
            className={`px-2.5 py-1 text-[11px] mono border rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice disabled:cursor-not-allowed disabled:opacity-50 ${
              selectedShortcut === 0.25 && canUseBalanceShortcuts
                ? "border-foreground bg-foreground/15 text-foreground font-medium"
                : "border-white/10 text-muted hover:border-white/30"
            }`}
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => handlePreset(0.5)}
            disabled={!canUseBalanceShortcuts}
            aria-pressed={selectedShortcut === 0.5 && canUseBalanceShortcuts}
            className={`px-2.5 py-1 text-[11px] mono border rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice disabled:cursor-not-allowed disabled:opacity-50 ${
              selectedShortcut === 0.5 && canUseBalanceShortcuts
                ? "border-foreground bg-foreground/15 text-foreground font-medium"
                : "border-white/10 text-muted hover:border-white/30"
            }`}
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => handlePreset(1.0)}
            disabled={!canUseBalanceShortcuts}
            aria-pressed={selectedShortcut === 1 && canUseBalanceShortcuts}
            className={`px-2.5 py-1 text-[11px] mono border rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice disabled:cursor-not-allowed disabled:opacity-50 ${
              selectedShortcut === 1 && canUseBalanceShortcuts
                ? "border-foreground bg-foreground/15 text-foreground font-medium"
                : "border-white/10 text-muted hover:border-white/30"
            }`}
          >
            MAX
          </button>
        </div>
        {isInvalidAmount && inputAmountStr.trim() !== "" && (
          <span role="alert" className="text-[12px] text-negative">
            Enter an amount greater than zero.
          </span>
        )}
        {isTokenBalanceLoading && (
          <span role="status" className="text-[12px] text-muted">
            Checking {market.quoteAsset} balance…
          </span>
        )}
        {isTokenBalanceUnavailable && (
          <span role="alert" className="text-[12px] text-negative">
            Unable to verify your {market.quoteAsset} balance.
          </span>
        )}
        {isInsufficientBalance && (
          <span role="alert" className="text-[12px] text-negative">
            You need {formatTokenAmount(inputAmount)} {market.quoteAsset} to continue.
          </span>
        )}
        {isConnected && !isWrongNetwork && isNativeBalanceZero && (
          <span role="alert" className="text-[12px] text-negative">
            Insufficient ETH for network fees.
          </span>
        )}
        {isConnected && !isWrongNetwork && isNativeBalanceUnavailable && (
          <span role="alert" className="text-[12px] text-negative">
            Unable to verify ETH for network fees.
          </span>
        )}
        {isConnected && !isWrongNetwork && isNativeBalanceLoading && (
          <span role="status" className="text-[12px] text-muted">
            Checking ETH for network fees…
          </span>
        )}
      </div>

      {/* Strategy-Specific Details */}
      {quoteState === "ready" ? (
        isFixed ? (
        /* FIXED YIELD SECTION */
        <div className="flex flex-col gap-4 pt-2">
          <p className="m-0 text-[12px] leading-5 text-muted-dark">
            Indicative Pendle route quote. Output is checked again and wallet-specific calldata is refreshed before you sign.
          </p>
          <div className="flex flex-col gap-1 p-3.5 border border-ice/20 bg-ice/5 rounded-lg">
            <span className="text-[13px] text-muted-dark">
              Estimated maturity value on {market.maturity}
            </span>
            <div className="mono text-[30px] sm:text-[34px] tracking-[-0.02em] text-foreground flex items-baseline gap-2">
              <span className={!fixedQuote ? "text-[16px] text-muted" : undefined}>
                {fixedQuote ? formatTokenAmount(fixedQuote.estimatedMaturityValue) : "Available after quote"}
              </span>
              {fixedQuote && <span className="text-[16px] text-muted">{market.symbol}</span>}
            </div>
            <div className="mono text-[13px] text-ice">
              {fixedQuote
                ? `+${(fixedQuote.estimatedMaturityValue - inputAmount).toFixed(2)} ${market.symbol} projected at maturity`
                : "Quoted outcome available after amount and quote"}
            </div>
          </div>

          <div className="flex flex-col text-[14px]">
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Estimated output (PT)</span>
              <span className="mono text-right text-muted">{fixedQuote ? `${formatTokenAmount(fixedQuote.ptReceived)} ${market.symbol}` : "Available after quote"}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Quoted Fixed APY</span>
              <span className="mono text-ice font-medium">
                {fixedQuote ? formatApy(fixedQuote.quotedFixedApy) : "Available after entering an amount"}
              </span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Implied APY</span>
              <span className="mono text-muted">{formatApy(market.impliedApy)}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Maturity</span>
              <span className="mono text-muted">
                {market.maturity} · {market.daysRemaining}d left
              </span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Price Impact</span>
              <span className="mono text-muted">
                {fixedQuote ? formatPriceImpact(fixedQuote.priceImpact) : "Available after quote"}
              </span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Network Fee</span>
              <span className="text-muted-dark text-[13px]">
                {fixedQuote && fixedQuote.networkFeeEstimate !== undefined
                  ? formatNetworkFee(fixedQuote.networkFeeEstimate)
                  : "Shown before you confirm"}
              </span>
            </div>
          </div>
        </div>
        ) : (
        /* LONG YIELD SECTION */
        <div className="flex flex-col gap-4 pt-2">
          <p className="m-0 text-[12px] leading-5 text-muted-dark">
            Indicative Pendle route quote. Output is checked again and wallet-specific calldata is refreshed before you sign.
          </p>
          <div className="flex flex-col gap-1 p-3.5 border border-amber/20 bg-amber/5 rounded-lg">
            <span className="text-[13px] text-muted-dark">
              Estimated Yield Exposure
            </span>
            <div className="mono text-[30px] sm:text-[34px] tracking-[-0.02em] text-foreground flex items-baseline gap-2">
              <span className={!longQuote ? "text-[16px] text-muted" : undefined}>
                {longQuote ? `~${formatTokenAmount(longQuote.estimatedYieldExposure, 0)}` : "Available after quote"}
              </span>
              {longQuote && <span className="text-[16px] text-muted">{market.symbol}</span>}
          </div>
            <div className="mono text-[13px] text-amber">
              {longQuote ? "Current quote estimate" : "Break-even shown after quote"}
            </div>
          </div>

          {/* Scenario Table */}
          {longQuote?.estimatedReturns && (
            <div className="flex flex-col gap-2">
              <span className="mono text-[11px] tracking-wider text-muted-dark uppercase">
                If average realized rate is…
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-white/10 rounded p-2.5 flex flex-col">
                  <span className="mono text-[12px] text-muted-dark">
                    {formatApy(longQuote.estimatedReturns.currentRate.apy)} (Rate now)
                  </span>
                  <span className="mono text-[16px] text-foreground font-medium">
                    ~{longQuote.estimatedReturns.currentRate.returnAmount}
                  </span>
                  <span
                    className={`mono text-[12px] ${
                      longQuote.estimatedReturns.currentRate.percentChange >= 0
                        ? "text-positive"
                        : "text-negative"
                    }`}
                  >
                    {formatScenarioChange(
                      longQuote.estimatedReturns.currentRate.percentChange
                    )}
                  </span>
                </div>
                <div className="border border-white/10 rounded p-2.5 flex flex-col">
                  <span className="mono text-[12px] text-muted-dark">
                    {formatApy(longQuote.estimatedReturns.lowerRate.apy)} (Rate drops)
                  </span>
                  <span className="mono text-[16px] text-foreground font-medium">
                    ~{longQuote.estimatedReturns.lowerRate.returnAmount}
                  </span>
                  <span
                    className={`mono text-[12px] ${
                      longQuote.estimatedReturns.lowerRate.percentChange >= 0
                        ? "text-positive"
                        : "text-negative"
                    }`}
                  >
                    {formatScenarioChange(
                      longQuote.estimatedReturns.lowerRate.percentChange
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Prominent Risk Warning Banner */}
          <div className="p-3.5 border border-amber/40 bg-amber/10 rounded-lg flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
            <p className="m-0 text-[12px] leading-[1.5] text-muted-light font-normal">
              <strong className="text-amber font-medium">Risk Notice: </strong>
              If the underlying yield is lower than the implied yield you paid
              for, a large portion of the position value can be lost. Trading
              Yield expires at maturity.
            </p>
          </div>

          <div className="flex flex-col text-[14px]">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">You receive (YT)</span>
              <span className="mono text-right text-muted">{longQuote ? `${formatTokenAmount(longQuote.ytReceived)} ${market.symbol}` : "Available after quote"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Underlying APY</span>
              <span className="mono text-muted">{formatApy(market.underlyingApy)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Implied APY</span>
              <span className="mono text-muted">{formatApy(market.impliedApy)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Break-Even APY</span>
              <span className="mono text-muted">
                {longQuote ? formatApy(longQuote.estimatedBreakEvenApy) : "Available after quote"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Maturity</span>
              <span className="mono text-muted">
                {market.maturity} · {market.daysRemaining}d left
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Price Impact</span>
              <span className="mono text-muted">
                {longQuote ? formatPriceImpact(longQuote.priceImpact) : "Available after quote"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Network Fee</span>
              <span className="text-muted-dark text-[13px]">
                {longQuote && longQuote.networkFeeEstimate !== undefined
                  ? formatNetworkFee(longQuote.networkFeeEstimate)
                  : "Shown before you confirm"}
              </span>
            </div>
            <p className="m-0 pt-3 text-[12px] leading-[1.5] text-muted-dark">
              Break-even: this position benefits when average realized yield until maturity is higher than the implied
              yield priced by the market.
            </p>
          </div>
        </div>
          )
        ) : (
          <QuoteStateNotice state={quoteState} isExpired={isQuoteExpired} error={quoteError} />
        )}

      {txState.step === "error" && txState.errorMessage && !quoteRefreshRequired && (
        <div role="alert" className="border border-negative/30 bg-negative/5 px-3.5 py-3 text-[12px] leading-5 text-negative">
          {txState.errorMessage}
        </div>
      )}
      {quoteRefreshRequired && (
        <div role="alert" className="border border-amber/30 bg-amber/5 px-3.5 py-3 text-[12px] leading-5 text-amber">
          {txState.errorMessage || "The previous transaction did not complete."} Refresh the quote before retrying.
        </div>
      )}

      {/* Advanced Details Toggle */}

      <div className="border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-[13px] text-muted-dark hover:text-muted transition-colors py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
        >
          <span className="mono tracking-wider">ADVANCED SPECIFICATION</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-2 pt-2 text-[12px] mono text-muted-dark bg-surface-raised/40 p-3 rounded">
            {isFixed ? (
              <>
                <div className="flex justify-between">
                  <span>PT Token</span>
                  <span className="text-ice">PT-{market.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>PT Price</span>
                  <span>{fixedQuoteForDisplay ? `${fixedQuoteForDisplay.ptPrice} ${market.symbol}` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contract Address</span>
                  <span className="text-muted-dark">{market.ptAddress || "Unavailable"}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>YT Token</span>
                  <span className="text-amber">YT-{market.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>YT Price</span>
                  <span>{longQuoteForDisplay ? `${longQuoteForDisplay.ytPrice} ${market.symbol}` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contract Address</span>
                  <span className="text-muted-dark">{market.ytAddress || "Unavailable"}</span>
                </div>
              </>
            )}
            <div className="flex justify-between gap-4">
              <span>Quote Source</span>
              <span className="text-right text-muted">
                {quoteForExecution?.source || (yieldAdapter.mode === "live" ? "Pendle Convert API" : "Mock quote engine")}
              </span>
            </div>
            {quoteError && (
              <div className="flex justify-between gap-4">
                <span>Raw Quote Error</span>
                <span className="max-w-[70%] text-right text-muted">
                  {getQuoteTechnicalMessage(quoteError)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        disabled={displayedPrimaryAction.disabled}
        onClick={displayedPrimaryAction.disabled ? undefined : handlePrimaryAction}
        className={`min-h-[52px] rounded-lg text-[15px] font-medium flex items-center justify-center gap-2 transition-all ${
          displayedPrimaryAction.disabled
            ? "border border-white/20 bg-surface text-muted-dark cursor-not-allowed"
            : displayedPrimaryAction.kind === "write"
              ? `border-0 text-[#0A0B0C] cursor-pointer ${isFixed ? "bg-ice hover:brightness-105" : "bg-amber hover:brightness-105"}`
              : displayedPrimaryAction.kind === "connect"
                ? "border-0 bg-amber text-[#0A0B0C] hover:brightness-105 cursor-pointer"
                : displayedPrimaryAction.kind === "switch-network"
                  ? "border-0 bg-negative text-white hover:brightness-105 cursor-pointer"
                  : displayedPrimaryAction.kind === "success"
                    ? "border-0 bg-positive text-[#0A0B0C] hover:brightness-105 cursor-pointer"
                    : "border border-white/20 bg-surface text-foreground cursor-pointer"
        }`}
      >
        {displayedPrimaryAction.busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {displayedPrimaryAction.kind === "success" && <CheckCircle2 className="w-4 h-4" />}
        {displayedPrimaryAction.label}
      </button>
      {txState.step === "pending" && txState.txHash && (
        <div role="status" className="border border-amber/25 bg-amber/5 px-3.5 py-3 text-[12px] leading-5 text-muted">
          <span className="text-amber">Transaction submitted · waiting for confirmation.</span>{" "}
          <a
            href={`https://robinhoodchain.blockscout.com/tx/${txState.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-ice underline underline-offset-2"
          >
            Check Blockscout
          </a>
          {txState.errorMessage && <p className="mb-0 mt-1 text-muted-dark">{txState.errorMessage}</p>}
        </div>
      )}
      {txState.step === "success" && txState.txHash && yieldAdapter.mode === "live" && (
        <div role="status" className="border border-positive/25 bg-positive/5 px-3.5 py-3 text-[12px] text-muted">
          <span className="text-positive">Confirmed on-chain.</span>{" "}
          <a
            href={`https://robinhoodchain.blockscout.com/tx/${txState.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-ice underline underline-offset-2"
          >
            View transaction
          </a>
        </div>
      )}
      {txState.step === "success" && yieldAdapter.mode === "mock" && (
        <div role="status" className="border border-amber/25 bg-amber/5 px-3.5 py-3 text-[12px] text-amber">
          Preview only — this position is stored locally. No blockchain transaction was sent.
        </div>
      )}
      {confirmedApprovalHash && yieldAdapter.mode === "live" && (
        <div role="status" className="text-[11px] text-muted-dark">
          Token approval confirmed ·{" "}
          <a
            href={`https://robinhoodchain.blockscout.com/tx/${confirmedApprovalHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-ice underline underline-offset-2"
          >
            View approval transaction
          </a>
        </div>
      )}
    </div>
  );
}

function QuoteStateNotice({
  state,
  isExpired,
  error,
}: {
  state: QuoteUiState;
  isExpired: boolean;
  error: unknown;
}) {
  const content =
    state === "quoting"
      ? {
          title: "Fetching live quote...",
          message: "The live position details will appear when the quote is ready.",
        }
      : state === "unavailable"
        ? { title: QUOTE_UNAVAILABLE_TITLE, message: getQuoteUserMessage(error) }
        : state === "minimum-amount"
          ? { title: "Amount below route minimum", message: getQuoteUserMessage(error) }
        : state === "error" && isExpired
          ? { title: "Quote expired", message: "Refresh the quote before confirming this position." }
          : state === "error"
            ? { title: "Quote request failed", message: getQuoteUserMessage(error) }
            : {
                title: "Preview your live position",
                message: "Enter an amount to preview your live position.",
              };

  return (
    <div className="border border-white/10 bg-surface-raised/40 p-5 text-center">
      <div className="mono text-[11px] uppercase tracking-[0.14em] text-muted-dark">
        {content.title}
      </div>
      <p className="mt-3 text-[14px] leading-6 text-muted">{content.message}</p>
    </div>
  );
}
