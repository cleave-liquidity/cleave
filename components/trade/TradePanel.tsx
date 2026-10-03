"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { YieldMarket } from "@/types/market";
import type { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import { useFixedYieldQuote } from "@/hooks/useFixedYieldQuote";
import { useLongYieldQuote } from "@/hooks/useLongYieldQuote";
import { useNetworkGuard } from "@/hooks/useNetworkGuard";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useTokenAllowance } from "@/hooks/useTokenAllowance";
import { useApproveToken } from "@/hooks/useApproveToken";
import { useOpenFixedPosition } from "@/hooks/useOpenFixedPosition";
import { useOpenLongPosition } from "@/hooks/useOpenLongPosition";
import { formatApy, formatTokenAmount } from "@/lib/utils/formatters";
import { toast } from "sonner";
import { TransactionState } from "@/types/transaction";
import { YieldDomainError, getYieldErrorMessage } from "@/types/errors";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { getContractByName } from "@/lib/contracts/deployments";
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
  QUOTE_ERROR_MESSAGE,
  QUOTE_UNAVAILABLE_MESSAGE,
  QUOTE_UNAVAILABLE_TITLE,
  type QuoteUiState,
} from "@/lib/markets/quote-state";

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
  const { balance } = useTokenBalance(
    address,
    market.quoteAsset,
    market.underlyingTokenAddress,
    market.underlyingDecimals,
    market.chainId,
  );
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

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const resetState = getTradeResetState(strategy, initialAmount);
    setInputAmountStr(resetState.inputAmount);
    setShowAdvanced(resetState.showAdvanced);
    setTxState(resetState.transactionState);
  }, [strategy, initialAmount]);

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
  const isInsufficientBalance = isConnected && !isInvalidAmount && inputAmount > balance;
  const isMarketUnavailable = market.status === "paused" || market.status === "matured";
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
    `${change >= 0 ? "+" : ""}${change}%`;

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

  const handlePreset = (percent: number) => {
    const val = (balance * percent).toFixed(2);
    setInputAmountStr(val);
  };

  const handleNetworkSwitch = async () => {
    try {
      setTxState({ step: "validating" });
      await switchToRobinhood();
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
      if (isMarketUnavailable) {
        throw new YieldDomainError(
          market.status === "paused" ? "market-paused" : "market-expired",
          market.status === "paused"
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
          `Successfully opened Long Yield position for ${inputAmount} ${market.quoteAsset}!`
        );
      }

      setTimeout(() => {
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
      setTimeout(() => {
        setTxState({ step: "idle" });
      }, 3000);
    }
  };

  return (
    <div className="border border-white/16 rounded-[10px] bg-surface p-5 sm:p-7 flex flex-col gap-5">
      {/* Panel Header */}
      <div className="flex justify-between items-center pb-2 border-b border-white/10">
        <span className="mono text-[13px] tracking-wider text-muted-dark uppercase">
          Trade Position
        </span>
      </div>

      {/* Amount Input */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[13px] text-muted-dark">
          <label htmlFor="trade-amount">You pay</label>
          <div className="flex items-center gap-2 mono text-[12px]">
            <span>
              BALANCE: {isConnected ? formatTokenAmount(balance) : "Connect wallet"}
            </span>
            <span className="text-muted-faint">{market.quoteAsset}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border border-white/18 rounded-lg bg-surface-raised px-4 min-h-[58px] focus-within:border-white/35 transition-colors">
          <input
            id="trade-amount"
            type="number"
            min="0"
            step="any"
            value={inputAmountStr}
            onChange={(e) => setInputAmountStr(e.target.value)}
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
            className="px-2.5 py-1 text-[11px] mono border border-white/12 rounded text-muted hover:border-white/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => handlePreset(0.5)}
            className="px-2.5 py-1 text-[11px] mono border border-white/12 rounded text-muted hover:border-white/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => handlePreset(1.0)}
            className="px-2.5 py-1 text-[11px] mono border border-white/12 rounded text-muted hover:border-white/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
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
              <span className="text-muted-dark">PT Received</span>
              <span className="mono text-right text-muted">{fixedQuote ? `${formatTokenAmount(fixedQuote.ptReceived)} ${market.symbol}` : "Available after quote"}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Quoted Fixed APY</span>
              <span className="mono text-ice font-medium">
                {fixedQuote ? formatApy(fixedQuote.quotedFixedApy) : "Available after entering an amount"}
              </span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Price Impact</span>
              <span className="mono text-muted">
                {fixedQuote ? `${fixedQuote.priceImpact}%` : "Available after quote"}
              </span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Network Fee</span>
              <span className="text-muted-dark text-[13px]">
                {fixedQuote && fixedQuote.networkFeeEstimate !== undefined
                  ? `~${fixedQuote.networkFeeEstimate} ETH`
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
              {longQuote ? "Current quote estimate" : "Break-even available after quote"}
            </div>
          </div>

          {/* Scenario Table */}
          {longQuote?.estimatedReturns && (
            <div className="flex flex-col gap-2">
              <span className="mono text-[11px] tracking-wider text-muted-dark uppercase">
                If average realized rate is…
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-white/12 rounded p-2.5 flex flex-col">
                  <span className="mono text-[12px] text-muted-dark">
                    {longQuote.estimatedReturns.currentRate.apy}% (Rate now)
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
                <div className="border border-white/12 rounded p-2.5 flex flex-col">
                  <span className="mono text-[12px] text-muted-dark">
                    {longQuote.estimatedReturns.lowerRate.apy}% (Rate drops)
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
              for, a large portion of the position value can be lost. YT value
              trends toward zero at maturity.
            </p>
          </div>

          <div className="flex flex-col text-[14px]">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">YT Received</span>
              <span className="mono text-right text-muted">{longQuote ? `${formatTokenAmount(longQuote.ytReceived)} ${market.symbol}` : "Available after quote"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Break-Even APY</span>
              <span className="mono text-muted">
                {longQuote ? `${longQuote.estimatedBreakEvenApy}%` : "Available after quote"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Price Impact</span>
              <span className="mono text-muted">
                {longQuote ? `${longQuote.priceImpact}%` : "Available after quote"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Network Fee</span>
              <span className="text-muted-dark text-[13px]">
                {longQuote && longQuote.networkFeeEstimate !== undefined
                  ? `~${longQuote.networkFeeEstimate} ETH`
                  : "Shown before you confirm"}
              </span>
            </div>
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
              Connect Wallet
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
            {txState.step === "approving" && "Approving Token..."}
            {txState.step === "approval-success" && "Approval Confirmed"}
            {(txState.step === "confirming" || txState.step === "pending") &&
              `Opening ${isFixed ? "Fixed" : "Long"} Position...`}
            {txState.step === "success" && (
              <>
                <CheckCircle2 className="w-4 h-4" /> Position Opened!
              </>
            )}
            {isApprovalRequired && (txState.step === "idle" || txState.step === "ready") && "Approve Token"}
            {(txState.step === "idle" || txState.step === "ready") &&
              !isApprovalRequired && (isFixed ? "Open Fixed Position" : "Open Long Position")}
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
    <div className="border border-white/12 bg-surface-raised/40 p-5 text-center">
      <div className="mono text-[11px] uppercase tracking-[0.14em] text-muted-dark">
        {content.title}
      </div>
      <p className="mt-3 text-[14px] leading-6 text-muted">{content.message}</p>
    </div>
  );
}
