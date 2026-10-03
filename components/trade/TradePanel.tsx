"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { YieldMarket } from "@/types/market";
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

export function TradePanel({
  market,
  initialStrategy = "fixed",
  initialAmount,
}: {
  market: YieldMarket;
  initialStrategy?: "fixed" | "long";
  initialAmount?: string;
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

  const [strategy, setStrategy] = useState<"fixed" | "long">(initialStrategy);
  // Long Yield opens with a smaller default ticket than Fixed (see the strategy toggle below).
  const [inputAmountStr, setInputAmountStr] = useState<string>(
    initialAmount ?? (initialStrategy === "long" ? "100" : "1000"),
  );
  const [txState, setTxState] = useState<TransactionState>({ step: "idle" });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const inputAmount = Number(inputAmountStr);
  const hasNumericAmount = inputAmountStr.trim() !== "" && Number.isFinite(inputAmount);

  const { quote: fixedQuote, isLoading: loadingFixed, error: fixedQuoteError, refresh: refreshFixed } = useFixedYieldQuote(
    market.id,
    inputAmount
  );
  const { quote: longQuote, isLoading: loadingLong, error: longQuoteError, refresh: refreshLong } = useLongYieldQuote(
    market.id,
    inputAmount
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
  const isQuoteExpired = Boolean(activeQuote && activeQuote.quoteExpiry <= currentTime);
  const isApprovalRequired = Boolean(
    yieldAdapter.mode === "live" &&
      isConnected &&
      activeQuote?.approvalToken &&
      activeQuote.approvalAmount &&
      market.underlyingTokenAddress &&
      activeQuote.approvalToken.toLowerCase() === market.underlyingTokenAddress.toLowerCase() &&
      allowance !== null &&
      allowance < activeQuote.approvalAmount,
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
      if (isFixed) await refreshFixed();
      else await refreshLong();
      toast.success("Quote refreshed");
    } catch (error: unknown) {
      toast.error(getYieldErrorMessage(error));
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
      if (isFixed ? !fixedQuote : !longQuote) {
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
          !activeQuote?.approvalToken ||
          !activeQuote.approvalAmount ||
          !market.underlyingTokenAddress ||
          activeQuote.approvalToken.toLowerCase() !== market.underlyingTokenAddress.toLowerCase()
        ) {
          throw new YieldDomainError("live-source-unavailable", "The live quote did not include verified approval data.");
        }
        setTxState({ step: "approval-required" });
        setTxState({ step: "approving" });
        await approveToken.mutateAsync({
          tokenAddress: activeQuote.approvalToken,
          owner: address,
          spender: approvalSpender,
          amount: activeQuote.approvalAmount,
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
      const message = getYieldErrorMessage(err);
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
        <span className="mono text-[12px] text-muted-dark">
          {market.daysRemaining} DAYS REMAINING
        </span>
      </div>

      {/* Strategy Selector */}
      <div
        role="group"
        aria-label="Strategy Mode"
        className="grid grid-cols-2 border border-white/18 rounded-lg overflow-hidden"
      >
        <button
          type="button"
          aria-pressed={isFixed}
          onClick={() => {
            setStrategy("fixed");
            if (inputAmountStr === "100") setInputAmountStr("1000");
          }}
          className={`min-h-[46px] border-0 text-[14px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ice ${
            isFixed
              ? "border-b-2 border-ice bg-ice/10 text-ice"
              : "bg-transparent text-muted hover:text-white"
          }`}
        >
          Fixed Yield
        </button>
        <button
          type="button"
          aria-pressed={!isFixed}
          onClick={() => {
            setStrategy("long");
            if (inputAmountStr === "1000") setInputAmountStr("100");
          }}
          className={`min-h-[46px] border-0 text-[14px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber ${
            !isFixed
              ? "border-b-2 border-amber bg-amber/10 text-amber"
              : "bg-transparent text-muted hover:text-white"
          }`}
        >
          Long Yield
        </button>
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
      {isFixed ? (
        /* FIXED YIELD SECTION */
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1 p-3.5 border border-ice/20 bg-ice/5 rounded-lg">
            <span className="text-[13px] text-muted-dark">
              You&apos;ll receive on {market.maturity}
            </span>
            <div className="mono text-[30px] sm:text-[34px] tracking-[-0.02em] text-foreground flex items-baseline gap-2">
              <span>
                {fixedQuote
                  ? formatTokenAmount(fixedQuote.estimatedMaturityValue)
                  : "0.00"}
              </span>
              <span className="text-[16px] text-muted">{market.symbol}</span>
            </div>
            <div className="mono text-[13px] text-ice">
              {fixedQuote
                ? `+${(fixedQuote.estimatedMaturityValue - inputAmount).toFixed(2)} ${market.symbol} · locked ${fixedQuote.quotedFixedApy}% APY`
                : "—"}
            </div>
          </div>

          <div className="flex flex-col text-[14px]">
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">PT Received</span>
              <span className="mono text-muted">{fixedQuote ? formatTokenAmount(fixedQuote.ptReceived) : "—"} {market.symbol}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Quoted Fixed APY</span>
              <span className="mono text-ice font-medium">
                {fixedQuote ? formatApy(fixedQuote.quotedFixedApy) : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Market Implied APY</span>
              <span className="mono text-muted">
                {formatApy(market.impliedApy)}
              </span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Price Impact</span>
              <span className="mono text-muted">
                {fixedQuote ? `${fixedQuote.priceImpact}%` : "0.00%"}
              </span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/10">
              <span className="text-muted-dark">Maturity</span>
              <span className="mono text-muted">{market.maturity}</span>
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
              You earn the yield on
            </span>
            <div className="mono text-[30px] sm:text-[34px] tracking-[-0.02em] text-foreground flex items-baseline gap-2">
              <span>
                {longQuote
                  ? `~${formatTokenAmount(longQuote.estimatedYieldExposure, 0)}`
                  : "0"}
              </span>
              <span className="text-[16px] text-muted">{market.symbol}</span>
            </div>
            <div className="mono text-[13px] text-amber">
              until {market.maturity} · break-even{" "}
              {longQuote?.estimatedBreakEvenApy}%
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
              <span className="mono text-muted">{longQuote ? formatTokenAmount(longQuote.ytReceived) : "—"} {market.symbol}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Underlying APY</span>
              <span className="mono text-amber">{longQuote ? `${longQuote.underlyingApy}%` : "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Implied APY</span>
              <span className="mono text-muted">{longQuote ? `${longQuote.impliedApy}%` : "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Estimated Yield Exposure</span>
              <span className="mono text-amber">{longQuote ? formatTokenAmount(longQuote.estimatedYieldExposure) : "—"} {market.symbol}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Break-Even APY</span>
              <span className="mono text-muted">
                {longQuote ? `${longQuote.estimatedBreakEvenApy}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Price Impact</span>
              <span className="mono text-muted">
                {longQuote ? `${longQuote.priceImpact}%` : "0.00%"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-muted-dark">Maturity</span>
              <span className="mono text-muted">{market.maturity}</span>
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
      )}

      {/* Advanced Details Toggle */}
      {quoteError && !activeQuote && (
        <div role="alert" className="text-[12px] text-negative">
          {getYieldErrorMessage(quoteError)}
        </div>
      )}

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
                  <span>{fixedQuote ? `${fixedQuote.ptPrice} ${market.symbol}` : "—"}</span>
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
                  <span>{longQuote ? `${longQuote.ytPrice} ${market.symbol}` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contract Address</span>
                  <span className="text-muted-dark">{market.ytAddress || "Unavailable"}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      {(() => {
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

        if (quoteError && !activeQuote) {
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
              isInsufficientBalance
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
