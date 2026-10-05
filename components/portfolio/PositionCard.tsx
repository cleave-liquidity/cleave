"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { FixedYieldPosition, LongYieldPosition, YieldPosition } from "@/types/position";
import { formatNetworkFee, formatPriceImpact, formatTokenAmount, formatUsd } from "@/lib/utils/formatters";
import { useApproveToken } from "@/hooks/useApproveToken";
import { useClaimYield, useRedeemFixed, useSellPosition } from "@/hooks/usePositionActions";
import { useExitQuote } from "@/hooks/useExitQuote";
import { useTokenAllowance } from "@/hooks/useTokenAllowance";
import { useNetworkGuard } from "@/hooks/useNetworkGuard";
import { useNativeBalance } from "@/hooks/useNativeBalance";
import { getYieldErrorMessage } from "@/types/errors";
import { AssetIcon } from "@/components/markets/AssetIcon";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { getConfiguredChainId } from "@/lib/web3/environment";
import { blocksExecutionForNativeBalance } from "@/lib/markets/native-balance";
import { canRedeemFixed, canSellPosition, isMatured as isPositionMatured } from "@/lib/positions/valuation";
import {
  formatPositionDate,
  formatPositionPnl,
  formatPositionTokenAmount,
  getFixedApyPresentation,
} from "@/lib/positions/presentation";
import {
  EXIT_TRANSACTION_UNAVAILABLE_MESSAGE,
  getSellFlowActionLabel,
  getSellQuoteContext,
  hasSellQuoteContextChanged,
  isExecutableExitQuote,
  isSellFlowBusy,
  requiresSellApproval,
  type SellFlowStep,
} from "@/lib/positions/sell-flow";
import type { ExitQuote } from "@/types/quote";

export function PositionCard({
  position,
  onActionComplete,
}: {
  position: YieldPosition;
  onActionComplete?: () => void;
}) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { address, chainId, isConnected } = useNetworkGuard();
  const claimYield = useClaimYield();
  const redeemFixed = useRedeemFixed();
  const sellPosition = useSellPosition();
  const approveToken = useApproveToken();

  const parsedPositionChainId = Number(position.id.split(":")[1]);
  const positionChainId = parsedPositionChainId === 4663 || parsedPositionChainId === 46630
    ? parsedPositionChainId
    : getConfiguredChainId();
  const nativeBalance = useNativeBalance(address, positionChainId);
  const exitQuoteQuery = useExitQuote(position.id, address, positionChainId);
  const exitQuote = exitQuoteQuery.quote;
  const exitAllowance = useTokenAllowance(
    address,
    exitQuote?.inputToken,
    exitQuote?.spender,
    positionChainId,
  );
  const [sellReviewOpen, setSellReviewOpen] = useState(false);
  const [sellFlowStep, setSellFlowStep] = useState<SellFlowStep>("idle");
  const [sellError, setSellError] = useState<string | null>(null);
  const [sellApprovalConfirmed, setSellApprovalConfirmed] = useState(false);
  const [sellReceivedAmount, setSellReceivedAmount] = useState<number | undefined>(undefined);
  const [sellNow, setSellNow] = useState(() => Date.now());
  const isWrongNetwork = isConnected && chainId !== positionChainId;
  const isNativeBalanceBlocking = blocksExecutionForNativeBalance({
    isConnected,
    isLoading: nativeBalance.isLoading,
    hasBalance: nativeBalance.hasBalance,
    balance: nativeBalance.balance,
    error: nativeBalance.error,
  });

  const isFixed = position.strategy === "fixed";
  const fixedPos = isFixed ? (position as FixedYieldPosition) : null;
  const longPos = !isFixed ? (position as LongYieldPosition) : null;

  const isMatured = position.status === "matured" || isPositionMatured(position.maturityDate);
  const isRedeemed = position.status === "redeemed";
  const isActive = position.status === "active";
  const canClaim =
    !isFixed &&
    position.status !== "closed" &&
    (isActive || isMatured) &&
    (longPos?.claimableYield || 0) > 0;
  const canSell = canSellPosition(position);
  const entryDataAvailable = position.entryDataAvailable !== false;
  const fixedApy = fixedPos ? getFixedApyPresentation(fixedPos) : null;
  const openedLabel = formatPositionDate(position.openedAt);
  const maturityLabel = formatPositionDate(position.maturityDate) === "—"
    ? position.maturity
    : formatPositionDate(position.maturityDate);
  const currentValueLabel = Number.isFinite(position.currentValue)
    ? formatUsd(position.currentValue)
    : "—";
  const sellQuoteExpired = Boolean(exitQuote && exitQuote.quoteExpiry <= sellNow);
  const sellApprovalRequired = requiresSellApproval(exitQuote, exitAllowance.allowance, sellApprovalConfirmed);
  const sellFlowBusy = isSellFlowBusy(sellFlowStep);
  const sellQuoteExecutable = isExecutableExitQuote(exitQuote);
  const quoteContext = getSellQuoteContext(address, chainId, positionChainId);
  const previousQuoteContext = useRef(quoteContext);

  useEffect(() => {
    if (!sellReviewOpen) return;
    const timer = window.setInterval(() => setSellNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [sellReviewOpen]);

  useEffect(() => {
    if (!hasSellQuoteContextChanged(previousQuoteContext.current, quoteContext)) return;
    previousQuoteContext.current = quoteContext;
    exitQuoteQuery.reset();
    if (address) void exitAllowance.refresh();
    setSellApprovalConfirmed(false);
    setSellReceivedAmount(undefined);
    if (sellReviewOpen && !sellFlowBusy) {
      setSellError("Wallet or network changed. Refresh the exit quote before continuing.");
      setSellFlowStep("error");
    }
  }, [address, exitAllowance, exitQuoteQuery, quoteContext, sellFlowBusy, sellReviewOpen]);

  useEffect(() => {
    if (!sellReviewOpen || !exitQuote || !sellQuoteExpired || sellFlowBusy || sellFlowStep === "error") return;
    void exitQuoteQuery.invalidate();
    setSellError("This exit quote expired. Refresh the quote before continuing.");
    setSellFlowStep("error");
  }, [exitQuote, exitQuoteQuery, sellFlowBusy, sellFlowStep, sellQuoteExpired, sellReviewOpen]);

  useEffect(() => {
    if (!sellReviewOpen || !exitQuote || sellQuoteExecutable || sellFlowBusy || sellFlowStep === "error") return;
    setSellError(EXIT_TRANSACTION_UNAVAILABLE_MESSAGE);
    setSellFlowStep("error");
  }, [exitQuote, sellFlowBusy, sellFlowStep, sellQuoteExecutable, sellReviewOpen]);

  const handleClaim = async () => {
    if (!longPos || !canClaim) return;
    try {
      setLoadingAction("claim");
      if (!address) throw new Error("Connect a wallet to claim yield.");
      const res = await claimYield.mutateAsync({ positionId: position.id, userAddress: address });
      toast.success(
        `Claimed ${formatTokenAmount(res.claimedAmount ?? 0)} ${position.assetSymbol}!`
      );
      onActionComplete?.();
    } catch (error: unknown) {
      toast.error(getYieldErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRedeem = async () => {
    if (!fixedPos || !canRedeemFixed(position)) return;
    try {
      setLoadingAction("redeem");
      if (!address) throw new Error("Connect a wallet to redeem this position.");
      const res = await redeemFixed.mutateAsync({ positionId: position.id, userAddress: address });
      toast.success(
        `Redeemed ${formatTokenAmount(res.redeemedAmount ?? 0)} ${position.assetSymbol} at maturity!`
      );
      onActionComplete?.();
    } catch (error: unknown) {
      toast.error(getYieldErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStartSellReview = async () => {
    if (!address || isWrongNetwork || isNativeBalanceBlocking || sellFlowBusy) return;
    setSellError(null);
    setSellApprovalConfirmed(false);
    setSellReceivedAmount(undefined);
    setSellNow(Date.now());
    setSellReviewOpen(true);
    setSellFlowStep("quoting");
    exitQuoteQuery.reset();
    const result = await exitQuoteQuery.refetch();
    if (result.error || !result.data) {
      const message = getYieldErrorMessage(result.error ?? new Error("Unable to fetch an exit quote."));
      setSellError(message.toLowerCase().includes("calldata") && message.toLowerCase().includes("invalid")
        ? EXIT_TRANSACTION_UNAVAILABLE_MESSAGE
        : message);
      setSellFlowStep("error");
      return;
    }
    if (!isExecutableExitQuote(result.data)) {
      setSellError(EXIT_TRANSACTION_UNAVAILABLE_MESSAGE);
      setSellFlowStep("error");
      return;
    }
    setSellFlowStep("review");
  };

  const handleCloseSellReview = () => {
    if (sellFlowBusy) return;
    setSellReviewOpen(false);
    setSellFlowStep("idle");
    setSellError(null);
    setSellApprovalConfirmed(false);
    setSellReceivedAmount(undefined);
    exitQuoteQuery.reset();
  };

  const handleExecuteSell = async () => {
    if (!address || !exitQuote) return;
    if (!sellQuoteExecutable) {
      setSellError(EXIT_TRANSACTION_UNAVAILABLE_MESSAGE);
      setSellFlowStep("error");
      return;
    }
    if (isWrongNetwork) {
      setSellError("Switch your wallet to Robinhood Chain before selling.");
      setSellFlowStep("ready");
      return;
    }
    if (sellQuoteExpired) {
      setSellError("This exit quote expired. Fetch a new quote before selling.");
      setSellFlowStep("error");
      return;
    }
    if (isNativeBalanceBlocking) {
      setSellError("Insufficient ETH for network fees.");
      setSellFlowStep("ready");
      return;
    }
    if (sellApprovalRequired) {
      setSellError("Approve PT before selling this position.");
      setSellFlowStep("review");
      return;
    }

    setSellError(null);
    setSellFlowStep("confirming");
    try {
      const res = await sellPosition.mutateAsync({
        positionId: position.id,
        userAddress: address,
        exitQuote,
        onTransactionSubmitted: () => setSellFlowStep("pending"),
      });
      setSellReceivedAmount(res.returnedAmount);
      setSellFlowStep("success");
      toast.success(`Position Sold for ${formatUsd(res.returnedAmount ?? 0)}.`);
      onActionComplete?.();
    } catch (error: unknown) {
      setSellError(getYieldErrorMessage(error));
      setSellFlowStep(sellApprovalConfirmed ? "ready" : "review");
      toast.error(getYieldErrorMessage(error));
    }
  };

  const handleContinueSell = async () => {
    if (!exitQuote || sellFlowBusy) return;
    if (!sellQuoteExecutable) {
      setSellError(EXIT_TRANSACTION_UNAVAILABLE_MESSAGE);
      setSellFlowStep("error");
      return;
    }
    if (sellQuoteExpired) {
      setSellError("This exit quote expired. Fetch a new quote before selling.");
      setSellFlowStep("error");
      return;
    }
    if (sellApprovalRequired) {
      if (!exitQuote.approvalToken || !exitQuote.approvalAmount || !address) return;
      if (exitAllowance.isLoading) {
        setSellError("Checking PT allowance. Try again when it is available.");
        return;
      }
      if (exitAllowance.error || exitAllowance.allowance === null) {
        setSellError("Unable to verify the PT allowance.");
        setSellFlowStep("error");
        return;
      }
      setSellError(null);
      setSellFlowStep("approving");
      try {
        await approveToken.mutateAsync({
          tokenAddress: exitQuote.approvalToken,
          owner: address,
          spender: exitQuote.spender,
          amount: exitQuote.approvalAmount,
          chainId: positionChainId,
          marketId: position.marketId,
        });
        setSellApprovalConfirmed(true);
        await exitAllowance.refresh();
        const refreshedQuote = await exitQuoteQuery.refetch();
        if (refreshedQuote.error || !refreshedQuote.data || !isExecutableExitQuote(refreshedQuote.data)) {
          setSellError(EXIT_TRANSACTION_UNAVAILABLE_MESSAGE);
          setSellFlowStep("error");
          return;
        }
        setSellFlowStep("ready");
      } catch (error: unknown) {
        setSellError(getYieldErrorMessage(error));
        setSellFlowStep("review");
        toast.error(getYieldErrorMessage(error));
      }
      return;
    }
    await handleExecuteSell();
  };

  return (
    <div
      className={`relative overflow-hidden border border-white/10 rounded-xl bg-surface/80 p-5 flex flex-col gap-4 md:grid md:grid-cols-[minmax(220px,2fr)_minmax(96px,0.85fr)_minmax(160px,1.35fr)_minmax(125px,1fr)_minmax(125px,1fr)_minmax(270px,1.8fr)] md:items-start md:gap-x-5 md:gap-y-0 md:rounded-none md:border-0 md:border-b md:border-white/[0.06] last:md:border-b-0 md:px-6 md:py-5 hover:bg-white/[0.025] transition-colors ${
        isFixed ? "border-l-2 border-l-ice" : "border-l-2 border-l-amber"
      }`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute right-[-30px] top-[-36px] opacity-40">
        <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
          <path d="M-20 120C50 25 120 20 250 70" stroke={isFixed ? "#3B86FF" : "#EF5F22"} strokeOpacity="0.32" strokeDasharray="2 9" />
          <circle cx="142" cy="48" r="3" fill={isFixed ? "#3B86FF" : "#EF5F22"} />
        </svg>
      </div>
      {/* Header */}
      <div className="min-w-0">
        <div className="flex items-start gap-2 min-w-0">
            <AssetIcon
              symbol={position.assetSymbol}
              name={position.assetSymbol}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[17px] leading-6 font-medium text-foreground break-words">
              {isFixed ? "Fixed Yield" : "Trading Yield"} · {position.assetSymbol}
              </div>
            </div>
            <span
              className={`mono shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${
                isFixed
                  ? "border-ice/30 text-ice bg-ice/10"
                  : "border-amber/30 text-amber bg-amber/10"
              }`}
            >
              {isFixed ? "PT" : "YT"}
            </span>
        </div>
        <div className="mt-2 space-y-1 text-[12px] leading-5 text-muted-dark">
          <div>Opened <span className="text-muted">{openedLabel}</span></div>
          <div>{isFixed ? "Matures" : "Expires"} <span className="text-muted">{maturityLabel}</span></div>
        </div>
        <div className="mt-2 text-[11px] text-muted-faint capitalize">
          {position.status}
        </div>
      </div>

      {/* Value */}
      <div className="min-w-0 border-t border-white/10 pt-3 md:border-0 md:pt-0">
        <span className="mono block text-[10px] uppercase tracking-[0.14em] text-muted-dark">Value</span>
        <span className="mono mt-1 block text-[17px] text-foreground break-words">{currentValueLabel}</span>
      </div>

      {/* Entry */}
      <div className="min-w-0 border-t border-white/10 pt-3 md:border-0 md:pt-0">
        <span className="mono block text-[10px] uppercase tracking-[0.14em] text-muted-dark">Entry</span>
        <div className="mt-1.5 space-y-1 text-[13px] leading-5">
          <div>
            <span className="text-muted-dark">Deposited: </span>
            <span className="mono text-foreground">
              {entryDataAvailable
                ? `${formatPositionTokenAmount(position.depositedAmount)} ${position.assetSymbol}`
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-dark">{isFixed ? `${fixedApy?.label}: ` : "Entry APY: "}</span>
            <span className="mono text-foreground">
              {isFixed ? fixedApy?.value : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Current */}
      <div className="min-w-0 border-t border-white/10 pt-3 md:border-0 md:pt-0">
        <span className="mono block text-[10px] uppercase tracking-[0.14em] text-muted-dark">Current</span>
        <span className="mt-1 block text-[13px] leading-5 text-muted-dark">Current Value:</span>
        <span className="mono block text-[17px] text-foreground break-words">{currentValueLabel}</span>
      </div>

      {/* PnL */}
      <div className="min-w-0 border-t border-white/10 pt-3 md:border-0 md:pt-0">
        <span className="mono block text-[10px] uppercase tracking-[0.14em] text-muted-dark">PnL</span>
        <span
          className={`mono mt-1 block text-[17px] break-words ${
            !entryDataAvailable || !Number.isFinite(position.pnl)
              ? "text-muted"
              : position.pnl >= 0
                ? "text-positive"
                : "text-negative"
          }`}
        >
          {formatPositionPnl(position.pnl, entryDataAvailable)}
        </span>
        <span className="block text-[12px] leading-5 text-muted-dark">Unrealized PnL</span>
      </div>

      {/* Action Buttons */}
      <div className="min-w-0 flex items-center justify-between gap-3 border-t border-white/10 pt-3 flex-wrap md:col-start-6 md:flex-col md:items-end md:justify-start md:gap-2 md:border-0 md:pt-0">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">
            Maturity / Action
          </span>
          <span className={`mono max-w-full break-words text-[15px] leading-5 ${isFixed ? "text-ice" : "text-amber"}`}>
            {isFixed
              ? `At Maturity: ${formatPositionTokenAmount(fixedPos?.ptAmount ?? Number.NaN)} ${position.assetSymbol}`
              : `Claimable: ${formatPositionTokenAmount(longPos?.claimableYield ?? Number.NaN)} ${position.assetSymbol}`}
          </span>
        </div>

        <Link
          href={`/markets/${position.marketId}`}
          className="whitespace-nowrap text-right text-[13px] text-muted transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice"
        >
          View Market →
        </Link>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-full md:flex-nowrap">
          {/* Trading Yield (long) actions */}
          {!isFixed && (isActive || isMatured) && (
            <button
              type="button"
              disabled={
                loadingAction !== null || !canClaim || isWrongNetwork || isNativeBalanceBlocking
              }
              onClick={handleClaim}
              className="inline-flex h-10 min-h-10 min-w-[136px] max-w-full shrink-0 items-center justify-center gap-1 rounded-md bg-amber px-3 text-[12px] font-medium text-[#0A0B0C] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            >
              {loadingAction === "claim" && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span className="flex min-w-0 flex-col items-center justify-center leading-none">
                <span className="whitespace-nowrap">Claim Yield</span>
                <span className="mono mt-0.5 whitespace-nowrap text-[10px] opacity-70">
                  {formatTokenAmount(longPos?.claimableYield || 0)} {position.assetSymbol}
                </span>
              </span>
            </button>
          )}

          {/* Fixed Strategy Redeem Action at Maturity */}
          {isFixed && isMatured && !isRedeemed && position.status !== "closed" && (
            <button
              type="button"
              disabled={!isMatured || isRedeemed || loadingAction !== null || isWrongNetwork || isNativeBalanceBlocking}
              onClick={handleRedeem}
              className={`min-h-[42px] px-4.5 rounded-lg text-[14px] font-medium flex items-center gap-1.5 transition-all ${
                isMatured && !isRedeemed
                  ? "bg-ice text-[#0A0B0C] hover:brightness-105 cursor-pointer"
                  : "bg-surface border border-white/14 text-muted-dark cursor-not-allowed"
              }`}
            >
              {loadingAction === "redeem" && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>{isRedeemed ? "Redeemed" : "Redeem at Maturity"}</span>
            </button>
          )}

          {/* Sell Early Option */}
          {canSell && (
            <button
              type="button"
              disabled={loadingAction !== null || sellFlowBusy || isWrongNetwork || isNativeBalanceBlocking}
              onClick={handleStartSellReview}
              className="inline-flex h-10 min-h-10 min-w-[96px] max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-white/25 bg-transparent px-3 text-[12px] text-foreground transition-colors hover:border-white/50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
            >
              {sellFlowStep === "quoting" && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span className="shrink-0">Sell Early</span>
            </button>
          )}
        </div>
        {isConnected && !isWrongNetwork && nativeBalance.status === "resolved" && nativeBalance.balance === 0 && (
          <span role="alert" className="w-full text-right text-[12px] text-negative">
            Insufficient ETH for network fees.
          </span>
        )}
        {isConnected && !isWrongNetwork && nativeBalance.status === "unavailable" && (
          <span role="alert" className="w-full text-right text-[12px] text-negative">
            Unable to verify ETH for network fees.
          </span>
        )}
      </div>

      {sellReviewOpen && typeof document !== "undefined" && createPortal(
        <SellReviewPanel
          currentValueLabel={currentValueLabel}
          receivedAmount={sellReceivedAmount}
          quote={exitQuote}
          step={sellFlowStep}
          error={sellError}
          quoteExpired={sellQuoteExpired}
          onCancel={handleCloseSellReview}
          onContinue={handleContinueSell}
          onSell={handleExecuteSell}
          onRefresh={handleStartSellReview}
        />,
        document.body,
      )}
    </div>
  );
}

function SellReviewPanel({
  currentValueLabel,
  receivedAmount,
  quote,
  step,
  error,
  quoteExpired,
  onCancel,
  onContinue,
  onSell,
  onRefresh,
}: {
  currentValueLabel: string;
  receivedAmount?: number;
  quote?: ExitQuote;
  step: SellFlowStep;
  error: string | null;
  quoteExpired: boolean;
  onCancel: () => void;
  onContinue: () => void;
  onSell: () => void;
  onRefresh: () => void;
}) {
  const isBusy = isSellFlowBusy(step);
  const isSuccess = step === "success";
  const quoteUnavailable = (step === "error" && !quote) || Boolean(quote && !isExecutableExitQuote(quote));
  const statusLabel = isBusy || isSuccess
    ? getSellFlowActionLabel(step)
    : quoteUnavailable
      ? "Exit quote unavailable"
      : quoteExpired
        ? "Quote expired"
        : step === "review"
          ? "Review Exit"
          : getSellFlowActionLabel(step);
  const actionLabel = (quoteExpired || quoteUnavailable) && !isBusy && !isSuccess
    ? "Refresh quote"
    : getSellFlowActionLabel(step);
  const progressStage = step === "approving"
    ? 1
    : step === "ready" || step === "confirming" || step === "pending" || step === "success"
      ? 2
      : 0;
  const handleAction = (quoteExpired || quoteUnavailable) && !isBusy && !isSuccess
    ? onRefresh
    : step === "ready"
      ? onSell
      : onContinue;
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex=\"-1\"])",
    ].join(",");
    const focusFirstControl = () => {
      dialog.querySelector<HTMLElement>("[data-modal-autofocus]")?.focus();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!isBusy) onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    focusFirstControl();
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousActiveElement && document.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  }, [isBusy]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[560px] flex-col border border-white/15 bg-[#0B0D11] shadow-[0_18px_70px_rgba(0,0,0,0.55)] ring-1 ring-ice/10"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">Fixed Yield position</div>
              <h2 id={titleId} className="mt-1 text-[24px] font-normal tracking-[-0.02em] text-foreground">Sell Early</h2>
              <p id={descriptionId} className="mt-2 max-w-[420px] text-[13px] leading-5 text-muted">
                Exit your Fixed Yield position before maturity at the current market price.
              </p>
            </div>
            <div className="flex shrink-0 items-start gap-3">
              <span className="mono pt-1 text-right text-[10px] uppercase tracking-[0.12em] text-ice">{statusLabel}</span>
              <button
                type="button"
                aria-label="Close Sell Early review"
                data-modal-autofocus
                onClick={onCancel}
                disabled={isBusy}
                className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2" aria-label="Sell Early progress">
            {[
              ["Review", 0],
              ["Approve PT", 1],
              ["Sell", 2],
            ].map(([label, stage]) => (
              <React.Fragment key={label}>
                <span className={`mono text-[10px] uppercase tracking-[0.1em] ${progressStage >= Number(stage) ? "text-ice" : "text-muted-faint"}`}>
                  {label}
                </span>
                {Number(stage) < 2 && <span className="h-px w-5 bg-white/15" aria-hidden="true" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 sm:px-6">
          {isSuccess ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center">
              <div className="mono text-[10px] uppercase tracking-[0.16em] text-ice">Position Sold</div>
              <div className="mt-5 w-full border-y border-white/10 py-5">
                <ReviewMetric
                  label="Received"
                  value={`${receivedAmount === undefined ? "—" : formatPositionTokenAmount(receivedAmount)} ${quote?.outputSymbol ?? ""}`.trim()}
                  tone="ice"
                  emphasis
                />
              </div>
              <p className="mt-4 max-w-[360px] text-[13px] leading-5 text-muted">
                The confirmed sale is reflected in your Portfolio.
              </p>
            </div>
          ) : step === "quoting" ? (
            <div className="flex min-h-[220px] items-center justify-center gap-2 text-[14px] text-muted" role="status">
              <Loader2 className="h-4 w-4 animate-spin text-ice" />
              Fetching exit quote…
            </div>
          ) : quoteUnavailable ? (
            <div className="my-5 border border-negative/30 bg-negative/5 px-3.5 py-4 text-[13px] leading-5 text-negative" role="alert">
              <div className="font-medium">Exit quote unavailable</div>
              <div className="mt-1 text-negative/80">{error ?? EXIT_TRANSACTION_UNAVAILABLE_MESSAGE}</div>
            </div>
          ) : quote ? (
            <>
              {quoteExpired && (
                <div className="mt-5 border border-amber/30 bg-amber/5 px-3.5 py-3 text-[12px] leading-5 text-amber" role="alert">
                  <div className="font-medium">Quote expired</div>
                  <div className="mt-1 text-amber/80">Refresh the quote before continuing.</div>
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/10 py-5">
                <ReviewMetric
                  label="You sell"
                  value={`${formatPositionTokenAmount(quote.inputAmount)} ${quote.inputSymbol}`}
                  emphasis
                />
                <ReviewMetric
                  label="Estimated receive"
                  value={`${formatPositionTokenAmount(quote.outputAmount)} ${quote.outputSymbol}`}
                  tone="ice"
                  emphasis
                />
                <ReviewMetric label="Minimum received" value={`${formatPositionTokenAmount(quote.minimumReceived)} ${quote.outputSymbol}`} />
                <ReviewMetric label="Current position value" value={currentValueLabel} />
                <ReviewMetric label="Price impact" value={formatPriceImpact(quote.priceImpact)} />
                <ReviewMetric label="Network fee" value={quote.networkFeeEstimate === undefined ? "—" : formatNetworkFee(quote.networkFeeEstimate)} />
                <ReviewMetric label="Maturity" value={quote.maturity} />
              </div>
              <div className="my-4 border-l-2 border-ice/60 bg-ice/5 px-3.5 py-3 text-[12px] leading-5 text-muted" role="note">
                <span className="font-medium text-foreground">Review only.</span>{" "}
                Your position stays open until the sell transaction is confirmed.
              </div>
            </>
          ) : null}

          {step === "ready" && (
            <div className="my-4 border border-amber/25 bg-amber/5 px-3.5 py-3 text-[12px] leading-5 text-amber" role="status">
              PT approval is confirmed. The sell transaction is a separate wallet confirmation.
            </div>
          )}
          {error && quote && !quoteExpired && (
            <div className="my-4 border border-negative/30 bg-negative/5 px-3.5 py-3 text-[12px] leading-5 text-negative" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 shrink-0 border-t border-white/10 bg-[#0B0D11] px-5 py-4 sm:px-6">
          <p className="mb-3 text-[11px] leading-4 text-muted-dark">
            {isSuccess
              ? "The sell transaction was confirmed."
              : step === "ready"
                ? "Your PT approval is complete. Continue with the separate sell transaction."
                : quoteUnavailable || quoteExpired
                  ? "No wallet action is requested until a valid quote is ready."
                  : "Continue opens the next required wallet step; the position is not sold until the sell transaction is confirmed."}
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isBusy}
              className="min-h-[44px] px-4 text-[14px] text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSuccess || quoteUnavailable ? "Close" : "Cancel"}
            </button>
            {isSuccess ? (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex min-h-[44px] items-center bg-ice px-5 text-[14px] font-medium text-[#0A0B0C] transition-all hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
              >
                View Portfolio
              </button>
            ) : (
            <button
              type="button"
              onClick={handleAction}
              disabled={isBusy || (!quote && step !== "error")}
              className="inline-flex min-h-[44px] items-center gap-2 bg-ice px-5 text-[14px] font-medium text-[#0A0B0C] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {actionLabel}
            </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewMetric({
  label,
  value,
  tone = "default",
  emphasis = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "ice";
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <span className="mono block text-[10px] uppercase tracking-[0.12em] text-muted-dark">{label}</span>
      <span className={`mono mt-1 block break-words ${emphasis ? "text-[18px]" : "text-[15px]"} ${tone === "ice" ? "text-ice" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
