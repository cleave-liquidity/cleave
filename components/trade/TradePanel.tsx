"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { YieldMarket } from "@/types/market";
import { useFixedYieldQuote } from "@/hooks/useFixedYieldQuote";
import { useLongYieldQuote } from "@/hooks/useLongYieldQuote";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { formatApy, formatTokenAmount } from "@/lib/utils/formatters";
import { toast } from "sonner";
import { TransactionStep } from "@/types/transaction";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

export function TradePanel({ market }: { market: YieldMarket }) {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const [strategy, setStrategy] = useState<"fixed" | "long">("fixed");
  const [inputAmountStr, setInputAmountStr] = useState<string>("1000");
  const [txStep, setTxStep] = useState<TransactionStep>("idle");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const inputAmount = parseFloat(inputAmountStr) || 0;
  const mockBalance = 2500.0;

  const { quote: fixedQuote, isLoading: loadingFixed } = useFixedYieldQuote(
    market.id,
    inputAmount
  );
  const { quote: longQuote, isLoading: loadingLong } = useLongYieldQuote(
    market.id,
    inputAmount
  );

  const isFixed = strategy === "fixed";
  const isWrongNetwork = isConnected && chainId !== 4663 && chainId !== 46630;
  const isInsufficientBalance = inputAmount > mockBalance;

  const handlePreset = (percent: number) => {
    const val = (mockBalance * percent).toFixed(2);
    setInputAmountStr(val);
  };

  const handleExecuteTrade = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (isWrongNetwork) {
      switchChain?.({ chainId: 4663 });
      return;
    }

    if (inputAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      // Step 1: Validation & Token Approval
      setTxStep("approval_pending");
      await new Promise((resolve) => setTimeout(resolve, 900));

      setTxStep("approval_success");
      toast.success(`${market.symbol} approval granted`);

      // Step 2: Open Position Transaction
      setTxStep("transaction_pending");
      await new Promise((resolve) => setTimeout(resolve, 1400));

      if (isFixed) {
        await yieldAdapter.openFixedPosition(market.id, inputAmount, address);
        toast.success(
          `Successfully opened Fixed Yield position for ${inputAmount} ${market.symbol}!`
        );
      } else {
        await yieldAdapter.openLongPosition(market.id, inputAmount, address);
        toast.success(
          `Successfully opened Long Yield position for ${inputAmount} ${market.symbol}!`
        );
      }

      setTxStep("transaction_success");

      setTimeout(() => {
        router.push("/portfolio");
      }, 1200);
    } catch (err: unknown) {
      const error = err as Error;
      setTxStep("error");
      toast.error(error?.message || "Transaction failed");
    } finally {
      setTimeout(() => {
        setTxStep("idle");
      }, 3000);
    }
  };

  return (
    <div className="border border-white/16 rounded-[10px] bg-surface p-5 sm:p-7 flex flex-col gap-5 sticky top-24">
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
          className={`min-h-[46px] border-0 text-[14px] font-medium transition-colors cursor-pointer ${
            isFixed
              ? "bg-ice text-[#0A0B0C]"
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
          className={`min-h-[46px] border-0 text-[14px] font-medium transition-colors cursor-pointer ${
            !isFixed
              ? "bg-amber text-[#0A0B0C]"
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
            <span>BALANCE: {formatTokenAmount(mockBalance)}</span>
            <span className="text-muted-faint">{market.symbol}</span>
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
            {market.symbol}
          </span>
        </div>

        {/* Quick Amount Presets */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => handlePreset(0.25)}
            className="px-2.5 py-1 text-[11px] mono border border-white/12 rounded text-muted hover:border-white/30 transition-colors"
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => handlePreset(0.5)}
            className="px-2.5 py-1 text-[11px] mono border border-white/12 rounded text-muted hover:border-white/30 transition-colors"
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => handlePreset(1.0)}
            className="px-2.5 py-1 text-[11px] mono border border-white/12 rounded text-muted hover:border-white/30 transition-colors"
          >
            MAX
          </button>
        </div>
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
              <span className="text-muted-dark">Network Fee</span>
              <span className="text-muted-dark text-[13px]">
                ~0.0004 ETH ($0.95)
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
          {longQuote && (
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
                  <span className="mono text-[12px] text-positive">
                    +{longQuote.estimatedReturns.currentRate.percentChange}%
                  </span>
                </div>
                <div className="border border-white/12 rounded p-2.5 flex flex-col">
                  <span className="mono text-[12px] text-muted-dark">
                    {longQuote.estimatedReturns.lowerRate.apy}% (Rate drops)
                  </span>
                  <span className="mono text-[16px] text-foreground font-medium">
                    ~{longQuote.estimatedReturns.lowerRate.returnAmount}
                  </span>
                  <span className="mono text-[12px] text-negative">
                    {longQuote.estimatedReturns.lowerRate.percentChange}%
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
              <span className="text-muted-dark">Network Fee</span>
              <span className="text-muted-dark text-[13px]">
                ~0.0004 ETH ($0.95)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Details Toggle */}
      <div className="border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-[13px] text-muted-dark hover:text-muted transition-colors py-1"
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
                  <span className="truncate max-w-[140px]">{market.ptAddress}</span>
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
                  <span className="truncate max-w-[140px]">{market.ytAddress}</span>
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
              onClick={openConnectModal}
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
              onClick={() => switchChain?.({ chainId: 4663 })}
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
          txStep === "approval_pending" || txStep === "transaction_pending";

        return (
          <button
            type="button"
            disabled={isPending || loadingFixed || loadingLong}
            onClick={handleExecuteTrade}
            className={`min-h-[52px] border-0 rounded-lg text-[#0A0B0C] text-[15px] font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isFixed
                ? "bg-ice hover:brightness-105"
                : "bg-amber hover:brightness-105"
            } ${isPending ? "opacity-80" : ""}`}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {txStep === "approval_pending" && "Approving Token..."}
            {txStep === "transaction_pending" &&
              `Opening ${isFixed ? "Fixed" : "Long"} Position...`}
            {txStep === "transaction_success" && (
              <>
                <CheckCircle2 className="w-4 h-4" /> Position Opened!
              </>
            )}
            {txStep === "idle" &&
              (isFixed ? "Open Fixed Position" : "Open Long Position")}
          </button>
        );
      })()}
    </div>
  );
}
