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
import { formatApy, formatNetworkFee, formatPriceImpact, formatTokenAmount } from "@/lib/utils/formatters";
import { toast } from "sonner";
import { TransactionState } from "@/types/transaction";
import { YieldDomainError, getYieldErrorMessage } from "@/types/errors";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { getContractByName } from "@/lib/contracts/deployments";
import { getMarketStatus, isMarketTradable } from "@/lib/markets/status";
import {
  getTradeResetState,
  isQuoteEnabledForStrategy,
  isSettledTransactionStep,
  type TradeStrategy,
} from "@/lib/markets/trade-strategy";
import {
  getQuoteTechnicalMessage,
  getQuoteUiState,
  getQuoteUserMessage,
  isQuoteExecutionReady,
  isQuoteRouteUnavailableError,
  QUOTE_ERROR_MESSAGE,
  QUOTE_UNAVAILABLE_MESSAGE,
  QUOTE_UNAVAILABLE_TITLE,
  type QuoteUiState,
} from "@/lib/markets/quote-state";
import { blocksExecutionForNativeBalance } from "@/lib/markets/native-balance";
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
  const { allowance, refresh: refreshAllowance } = useTokenAllowance(
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedShortcut, setSelectedShortcut] = useState<BalanceShortcut | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
      if (redirectTimerRef.current !== null) window.clearTimeout(redirectTimerRef.current);
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
    setSelectedShortcut(null);
  }, [strategy, initialAmount]);

  useEffect(() => {
    setSelectedShortcut(null);
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
      quoteForExecution?.approvalToken &&
      quoteForExecution.approvalAmount &&
      market.underlyingTokenAddress &&
      quoteForExecution.approvalToken.toLowerCase() === market.underlyingTokenAddress.toLowerCase() &&
      allowance !== null &&
      allowance < quoteForExecution.approvalAmount,
  );

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
      toast.success("Quote refreshed");
    } catch (error: unknown) {
      toast.error(getQuoteUserMessage(error));
    }
  };

  const handleExecuteTrade = async () => {
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

    try {
      setTxState({ step: "validating" });

      if (isInvalidAmount) {
        throw new YieldDomainError("invalid-amount", "Enter an amount greater than zero.");
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
        await approveToken.mutateAsync({
          tokenAddress: quoteForExecution.approvalToken,
          owner: address,
          spender: approvalSpender,
          amount: quoteForExecution.approvalAmount,
          chainId: market.chainId,
        });
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
        setTxState({ step: "pending" });
      }

      setTxState({ step: "pending" });
      if (isFixed) {
        const openedPosition = await openFixedPosition.mutateAsync({
          marketId: market.id,
          inputAmount,
          userAddress: address,
          quote: fixedQuote!,
          chainId,
          quoteAsset: market.quoteAsset,
        });
        const txHash = openedPosition.txHash ?? openedPosition.mockTxHash;
        setTxState({ step: "success", txHash });
        toast.success(
          `Successfully opened Fixed Yield position for ${inputAmount} ${market.quoteAsset}!`
        );
      } else {
        const openedPosition = await openLongPosition.mutateAsync({
          marketId: market.id,
          inputAmount,
          userAddress: address,
          quote: longQuote!,
          chainId,
          quoteAsset: market.quoteAsset,
        });
        const txHash = openedPosition.txHash ?? openedPosition.mockTxHash;
        setTxState({ step: "success", txHash });
        toast.success(
          `Successfully opened Trading Yield position for ${inputAmount} ${market.quoteAsset}!`
        );
      }

      redirectTimerRef.current = window.setTimeout(() => {
        router.push("/portfolio");
      }, 1200);
    } catch (err: unknown) {
      const message = isQuoteRouteUnavailableError(err)
        ? getQuoteUserMessage(err)
        : getYieldErrorMessage(err);
      setTxState({
        step: "error",
        errorCode: err instanceof YieldDomainError ? err.code : "transaction-reverted",
        errorMessage: message,
      });
      toast.error(message);
    } finally {
      // Clear the result banner after a moment, but only if the flow has actually finished.
      resetTimerRef.current = window.setTimeout(() => {
        setTxState((current) => (isSettledTransactionStep(current.step) ? { step: "idle" } : current));
      }, 3000);
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
                : balanceLoading
                  ? "Loading…"
                  : balanceError
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
                    : formatTokenAmount(nativeBalance.balance ?? 0, 6)} ETH
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
        {isInsufficientBalance && (
          <span role="alert" className="text-[12px] text-negative">
            Insufficient {market.quoteAsset} balance.
          </span>
        )}
        {isConnected && !isWrongNetwork && nativeBalance.status === "resolved" && nativeBalance.balance === 0 && (
          <span role="alert" className="text-[12px] text-negative">
            Insufficient ETH for network fees.
          </span>
        )}
        {isConnected && !isWrongNetwork && nativeBalance.status === "unavailable" && (
          <span role="alert" className="text-[12px] text-negative">
            Unable to verify ETH for network fees.
          </span>
        )}
      </div>

      {/* Strategy-Specific Details */}
      {quoteState === "ready" ? (
        isFixed ? (
        /* FIXED YIELD SECTION */
        <div className="flex flex-col gap-4 pt-2">
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
              <span className="text-muted-dark">You receive (PT)</span>
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
          <QuoteStateNotice state={quoteState} isExpired={isQuoteExpired} />
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
      {(() => {
        if (market.status === "paused") {
          return (
            <button
              type="button"
              disabled
              className="min-h-[52px] border border-white/20 rounded-lg bg-surface text-muted-dark text-[15px] font-medium flex items-center justify-center cursor-not-allowed"
            >
              Market Paused
            </button>
          );
        }

        if (market.status === "matured") {
          return (
            <button
              type="button"
              disabled
              className="min-h-[52px] border border-white/20 rounded-lg bg-surface text-muted-dark text-[15px] font-medium flex items-center justify-center cursor-not-allowed"
            >
              Market Expired
            </button>
          );
        }

        if (isQuoteExpired) {
          return (
            <button
              type="button"
              onClick={handleRefreshQuote}
              className="min-h-[52px] border border-white/20 rounded-lg bg-surface text-foreground text-[15px] font-medium flex items-center justify-center cursor-pointer"
            >
              Refresh Quote
            </button>
          );
        }

        if (quoteState === "unavailable" || quoteState === "error") {
          return (
            <button
              type="button"
              onClick={handleRefreshQuote}
              className="min-h-[52px] border border-white/20 rounded-lg bg-surface text-foreground text-[15px] font-medium flex items-center justify-center cursor-pointer"
            >
              Quote Unavailable — Retry
            </button>
          );
        }

        if (!isConnected) {
          return (
            <button
              type="button"
              onClick={handleConnectWallet}
              className="min-h-[52px] border-0 rounded-lg bg-amber text-[#0A0B0C] text-[15px] font-medium flex items-center justify-center hover:brightness-105 transition-all cursor-pointer"
            >
              Connect wallet to execute
            </button>
          );
        }

        if (isWrongNetwork) {
          return (
            <button
              type="button"
              onClick={handleNetworkSwitch}
              className="min-h-[52px] border-0 rounded-lg bg-negative text-white text-[15px] font-medium flex items-center justify-center hover:brightness-105 transition-all cursor-pointer"
            >
              Switch to Robinhood Chain
            </button>
          );
        }

        if (isInsufficientBalance) {
          return (
            <button
              type="button"
              disabled
              className="min-h-[52px] border border-white/20 rounded-lg bg-surface text-muted-dark text-[15px] font-medium flex items-center justify-center cursor-not-allowed"
            >
              Insufficient {market.symbol} Balance
            </button>
          );
        }

        const isPending =
          txState.step === "validating" ||
          txState.step === "approval-required" ||
          txState.step === "approving" ||
          txState.step === "approval-success" ||
          txState.step === "confirming" ||
          txState.step === "pending";

        return (
          <button
            type="button"
            disabled={
              isPending ||
              loadingFixed ||
              loadingLong ||
              isInvalidAmount ||
              isInsufficientBalance ||
              isNativeBalanceBlocking ||
              !isQuoteReady
            }
            onClick={handleExecuteTrade}
            className={`min-h-[52px] border-0 rounded-lg text-[#0A0B0C] text-[15px] font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isFixed
                ? "bg-ice hover:brightness-105"
                : "bg-amber hover:brightness-105"
            } ${isPending ? "opacity-80" : ""}`}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {txState.step === "approval-required" && "Approval Required"}
            {txState.step === "approving" && `Approving ${market.quoteAsset}…`}
            {txState.step === "approval-success" && "Approval Confirmed"}
            {(txState.step === "confirming" || txState.step === "pending") &&
              `Opening ${isFixed ? "Fixed Yield" : "Trading Yield"}…`}
            {txState.step === "success" && (
              <>
                <CheckCircle2 className="w-4 h-4" /> Position Opened!
              </>
            )}
            {isApprovalRequired && (txState.step === "idle" || txState.step === "ready") && `Approve ${market.quoteAsset}`}
            {(txState.step === "idle" || txState.step === "ready") &&
              !isApprovalRequired && (isFixed ? "Open Fixed Yield" : "Open Trading Yield")}
            {txState.step === "error" && "Try Again"}
          </button>
        );
      })()}
    </div>
  );
}

function QuoteStateNotice({
  state,
  isExpired,
}: {
  state: QuoteUiState;
  isExpired: boolean;
}) {
  const content =
    state === "quoting"
      ? {
          title: "Fetching live quote...",
          message: "The live position details will appear when the quote is ready.",
        }
      : state === "unavailable"
        ? { title: QUOTE_UNAVAILABLE_TITLE, message: QUOTE_UNAVAILABLE_MESSAGE }
        : state === "error" && isExpired
          ? { title: "Quote expired", message: "Refresh the quote before confirming this position." }
          : state === "error"
            ? { title: "Unable to fetch quote", message: QUOTE_ERROR_MESSAGE }
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
