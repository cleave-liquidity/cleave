"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

export function TradePreview() {
  const [strategy, setStrategy] = useState<"fixed" | "long">("fixed");
  const [payAmount, setPayAmount] = useState<number>(1000);
  const isFixed = strategy === "fixed";

  // Calculations for Fixed:
  // 6.42% fixed APY for 175 days (factor ~1.03008)
  const fixedPayout = useMemo(() => {
    return (payAmount * 1.03008).toFixed(2);
  }, [payAmount]);

  const fixedGain = useMemo(() => {
    return (payAmount * 0.03008).toFixed(2);
  }, [payAmount]);

  // Calculations for Long:
  // ~16.9x notional exposure
  const longNotional = useMemo(() => {
    return Math.round(payAmount * 16.9);
  }, [payAmount]);

  const longProjected7 = useMemo(() => {
    return (payAmount * 1.1373).toFixed(2);
  }, [payAmount]);

  const longProjected4 = useMemo(() => {
    return (payAmount * 0.642).toFixed(2);
  }, [payAmount]);

  return (
    <section
      id="trade"
      className="relative max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 lg:pt-40 select-none"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] gap-12 lg:gap-20 items-start">
        {/* Left Information */}
        <div className="flex flex-col gap-6">
          <div className="mono flex items-center gap-2 text-[11px] tracking-[0.22em] text-muted uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-ice shrink-0" />
            04 — OPEN A POSITION
          </div>
          <h2 className="m-0 text-[36px] sm:text-[48px] lg:text-[60px] leading-[1.04] font-normal tracking-[-0.035em] text-balance">
            Same market.
            <br />
            <span className="text-muted">Pick a side.</span>
          </h2>
          <p className="m-0 text-[15px] sm:text-[17px] leading-[1.6] text-muted font-light max-w-[480px]">
            Fixed tells you exactly what you&apos;ll have at maturity. Long gives you up to
            16.9x capital efficiency on floating borrow rates.
          </p>

          {/* Interactive Steps with sleek glass cards */}
          <div className="flex flex-col gap-3 mt-2 max-w-[480px]">
            <div
              className={`p-4 rounded-xl border transition-all flex items-start gap-4 ${
                isFixed
                  ? "bg-surface/80 border-ice/30 shadow-[0_0_25px_rgba(169,200,238,0.06)]"
                  : "bg-surface/40 border-white/10"
              }`}
            >
              <span className="mono text-[12px] font-semibold px-2 py-0.5 rounded bg-white/10 text-foreground shrink-0 mt-0.5">
                01
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-medium text-foreground">
                  Select Strategy Mode
                </span>
                <span className="text-[13px] text-muted leading-relaxed">
                  Choose <span className="text-ice">Fixed Yield (PT)</span> for upfront certainty or{" "}
                  <span className="text-amber">Long Yield (YT)</span> for amplified rate exposure.
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-surface/40 flex items-start gap-4">
              <span className="mono text-[12px] font-semibold px-2 py-0.5 rounded bg-white/10 text-foreground shrink-0 mt-0.5">
                02
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-medium text-foreground">
                  Enter USDG Collateral
                </span>
                <span className="text-[13px] text-muted leading-relaxed">
                  All contracts settle directly in USDG backed 1:1 by Paxos prime lending vaults.
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-surface/40 flex items-start gap-4">
              <span className="mono text-[12px] font-semibold px-2 py-0.5 rounded bg-white/10 text-foreground shrink-0 mt-0.5">
                03
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-medium text-foreground">
                  Single Transaction Execution
                </span>
                <span className="text-[13px] text-muted leading-relaxed">
                  Instant settlement on Robinhood Chain with transparent on-chain liquidity.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Trading Terminal Preview Card */}
        <div className="border border-white/15 rounded-2xl bg-surface/90 backdrop-blur-md p-6 sm:p-8 flex flex-col gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          {/* Header row */}
          <div className="flex justify-between items-start gap-4 pb-4 border-b border-white/10">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-positive shrink-0" />
                <span className="text-[17px] font-medium text-foreground">
                  USDG · Morpho Prime Vault
                </span>
              </div>
              <span className="mono text-[11px] text-muted-dark tracking-[0.1em]">
                MATURITY: 26 MAR 2027 · 175 DAYS REMAINING
              </span>
            </div>
            <span className="mono text-[10px] tracking-[0.14em] text-muted-dark border border-white/15 px-2.5 py-1 rounded-full uppercase">
              TERMINAL PREVIEW
            </span>
          </div>

          {/* Strategy Tabs */}
          <div
            role="group"
            aria-label="Strategy"
            className="grid grid-cols-2 p-1 bg-surface-raised rounded-xl border border-white/10"
          >
            <button
              type="button"
              aria-pressed={isFixed}
              onClick={() => setStrategy("fixed")}
              className={`min-h-[44px] rounded-lg text-[14px] font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isFixed
                  ? "bg-ice text-[#0A0C10] shadow-[0_2px_12px_rgba(169,200,238,0.25)]"
                  : "bg-transparent text-muted hover:text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Fixed Yield (PT)
            </button>
            <button
              type="button"
              aria-pressed={!isFixed}
              onClick={() => setStrategy("long")}
              className={`min-h-[44px] rounded-lg text-[14px] font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                !isFixed
                  ? "bg-amber text-[#0A0C10] shadow-[0_2px_12px_rgba(240,168,92,0.25)]"
                  : "bg-transparent text-muted hover:text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Long Yield (YT)
            </button>
          </div>

          {/* Pay Input Box */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[12px] mono text-muted-dark">
              <span>YOU DEPOSIT</span>
              <span>WALLET: 2,500.00 USDG</span>
            </div>
            <div className="flex items-center justify-between gap-3 border border-white/15 rounded-xl bg-surface-raised px-4.5 py-3.5 focus-within:border-white/40 transition-colors">
              <input
                id="pay-input"
                type="number"
                min="100"
                step="100"
                value={payAmount}
                onChange={(e) => setPayAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                className="mono flex-grow min-w-0 bg-transparent border-0 text-foreground text-[28px] font-medium outline-none"
              />
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex gap-1">
                  {[500, 1000, 2500].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPayAmount(v)}
                      className={`mono text-[10px] px-2 py-1 rounded border transition-all ${
                        payAmount === v
                          ? "border-white/40 bg-white/15 text-foreground"
                          : "border-white/10 text-muted hover:border-white/20"
                      }`}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
                <span className="mono text-[14px] font-medium text-foreground bg-white/10 px-2.5 py-1 rounded">
                  USDG
                </span>
              </div>
            </div>
          </div>

          {/* Strategy Output Area */}
          {isFixed ? (
            <div className="flex flex-col gap-5 pt-1">
              <div className="p-4.5 rounded-xl bg-ice/8 border border-ice/20 flex flex-col gap-1.5">
                <span className="mono text-[11px] text-muted tracking-[0.12em] uppercase">
                  Guaranteed Maturity Value (26 Mar 2027)
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="mono text-[36px] font-medium text-foreground">
                    ${fixedPayout} <span className="text-[16px] text-muted font-normal">USDG</span>
                  </span>
                  <span className="mono text-[13px] text-ice font-medium">
                    +${fixedGain} (+6.42% APY)
                  </span>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-white/10 text-[13px]">
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Market Fixed Rate</span>
                  <span className="mono text-foreground font-medium">6.42%</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Price Impact</span>
                  <span className="mono text-foreground">0.01%</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Tokens Minted</span>
                  <span className="mono text-ice font-medium">
                    {(payAmount / 0.9708).toFixed(2)} PT-USDG @ $0.9708
                  </span>
                </div>
              </div>

              <Link
                href="/trade?market=usdg-morpho-26mar27&side=fixed"
                className="min-h-[50px] rounded-xl bg-ice text-[#0A0C10] text-[15px] font-medium flex items-center justify-center hover:bg-white transition-all shadow-[0_4px_24px_rgba(169,200,238,0.25)]"
              >
                Lock Fixed Rate (PT) &rarr;
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-5 pt-1">
              <div className="p-4.5 rounded-xl bg-amber/8 border border-amber/20 flex flex-col gap-1.5">
                <span className="mono text-[11px] text-muted tracking-[0.12em] uppercase">
                  Yield Exposure on Notional Capital
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="mono text-[36px] font-medium text-foreground">
                    ~${longNotional.toLocaleString()}{" "}
                    <span className="text-[16px] text-muted font-normal">USDG</span>
                  </span>
                  <span className="mono text-[13px] text-amber font-medium">~16.9x LEV</span>
                </div>
              </div>

              {/* Scenario preview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-white/10 bg-surface-raised flex flex-col gap-1">
                  <span className="mono text-[11px] text-muted">Rate holds @ 7.10%</span>
                  <span className="mono text-[16px] text-positive font-medium">
                    ~${longProjected7} (+13.7%)
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-white/10 bg-surface-raised flex flex-col gap-1">
                  <span className="mono text-[11px] text-muted">Rate falls @ 4.00%</span>
                  <span className="mono text-[16px] text-negative font-medium">
                    ~${longProjected4} (−35.8%)
                  </span>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-white/10 text-[13px]">
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Break-even Rate</span>
                  <span className="mono text-amber font-medium">6.23% APY</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Tokens Minted</span>
                  <span className="mono text-foreground font-medium">
                    {(payAmount / 0.059).toFixed(0)} YT-USDG @ $0.059
                  </span>
                </div>
              </div>

              <Link
                href="/trade?market=usdg-morpho-26mar27&side=long"
                className="min-h-[50px] rounded-xl bg-amber text-[#0A0C10] text-[15px] font-medium flex items-center justify-center hover:bg-white transition-all shadow-[0_4px_24px_rgba(240,168,92,0.25)]"
              >
                Trade Long Yield (YT) &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
