"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

const SCENARIOS = [
  { label: "Rate Drop (4.0%)", rate: 4.0 },
  { label: "Current (7.1%)", rate: 7.1 },
  { label: "Rate Surge (12.0%)", rate: 12.0 },
];

export function StrategySection() {
  // Simulated lending rate in percentage (3.0% to 15.0%)
  const [simulatedRate, setSimulatedRate] = useState<number>(7.1);
  // Reference deposit amount in USDG
  const [depositAmount, setDepositAmount] = useState<number>(1000);

  // Constants for 175-day maturity (from 02 Oct 2026 to 26 Mar 2027)
  const FIXED_APY = 6.42;
  const BREAK_EVEN_RATE = 6.23;
  const YEAR_FRAC = 175 / 365; // ~0.4795

  // Calculations for Fixed Yield (PT):
  // Buy at discount, redeem at 1.0. Fixed return is locked regardless of rate!
  const fixedGrossReturn = useMemo(() => {
    // 1 USDG bought at ~0.9708 -> pays $1,030.08 per 1,000
    const lockedYield = depositAmount * (FIXED_APY / 100) * YEAR_FRAC;
    return depositAmount + lockedYield;
  }, [depositAmount]);

  const fixedNetProfit = fixedGrossReturn - depositAmount;
  const fixedRoiPct = (fixedNetProfit / depositAmount) * 100;

  // Calculations for Long Yield (YT):
  // YT price is ~$0.059 per YT. $1,000 buys ~16,949 YT (exposure to $16,949 USDG vault!)
  const longEffectiveNotional = depositAmount * 16.9; // 16.9x exposure
  const longGrossYield = useMemo(() => {
    return longEffectiveNotional * (simulatedRate / 100) * YEAR_FRAC;
  }, [longEffectiveNotional, simulatedRate]);

  const longNetProfit = longGrossYield - depositAmount;
  const longRoiPct = (longNetProfit / depositAmount) * 100;
  const isLongProfitable = longNetProfit >= 0;

  // Dynamic SVG path for Long Yield wave that reacts to simulatedRate
  const dynamicLongWave = useMemo(() => {
    // Amplitude scales with rate (higher rate = higher oscillation & higher center)
    const baseAmp = 12 + (simulatedRate / 15) * 24;
    const centerOffset = ((simulatedRate - BREAK_EVEN_RATE) / 10) * 28;
    const centerY = 65 - centerOffset;

    const points: string[] = [];
    for (let x = 10; x <= 510; x += 15) {
      const wave =
        Math.sin((x - 10) / 32) * baseAmp * 0.7 +
        Math.cos((x - 10) / 64) * (baseAmp * 0.4);
      const y = Math.max(15, Math.min(115, centerY + wave));
      points.push(`${x === 10 ? "M" : "L"} ${x} ${y.toFixed(1)}`);
    }
    return points.join(" ");
  }, [simulatedRate]);

  return (
    <section
      id="strategy"
      className="relative max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 lg:pt-40 select-none"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="flex flex-col gap-4 max-w-[680px]">
          <div className="mono flex items-center gap-2 text-[11px] tracking-[0.22em] text-muted uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
            02 — INTERACTIVE SIMULATOR
          </div>
          <h2 className="m-0 text-[34px] sm:text-[46px] lg:text-[58px] leading-[1.05] font-normal tracking-[-0.035em] text-balance">
            Know your number.
            <br />
            <span className="text-muted">Or bet on it.</span>
          </h2>
          <p className="m-0 text-[15px] sm:text-[17px] leading-[1.6] text-muted font-light">
            Slide the variable lending rate to test how Fixed (PT) and Long (YT)
            positions react under different market conditions.
          </p>
        </div>

        {/* Amount Selector */}
        <div className="flex flex-col gap-2">
          <span className="mono text-[11px] tracking-[0.14em] text-muted-dark uppercase">
            Simulated Capital:
          </span>
          <div className="flex items-center gap-1.5">
            {[1000, 5000, 25000].map((amt) => (
              <button
                key={amt}
                onClick={() => setDepositAmount(amt)}
                className={`mono text-[11px] tracking-[0.1em] px-3 py-1.5 border transition-all ${
                  depositAmount === amt
                    ? "border-foreground bg-foreground/15 text-foreground font-medium"
                    : "border-white/10 text-muted hover:border-white/30 hover:text-foreground"
                }`}
              >
                ${amt.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Rate Simulator Bar ── */}
      <div className="mt-8 p-5 sm:p-6 bg-surface/70 border border-white/10 rounded-xl backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <div className="flex items-center justify-between md:justify-start gap-3">
            <span className="mono text-[11px] tracking-[0.16em] text-muted-dark uppercase">
              Underlying Vault APY
            </span>
            <span className="mono text-[20px] font-semibold text-foreground">
              {simulatedRate.toFixed(2)}%
            </span>
          </div>
          <span className="mono text-[11px] text-muted-dark">
            Break-even threshold for Long Yield:{" "}
            <span className="text-amber">6.23%</span>
          </span>
        </div>

        {/* Slider Input */}
        <div className="flex-1 w-full max-w-[480px] flex flex-col gap-2">
          <input
            type="range"
            min="3.0"
            max="15.0"
            step="0.1"
            value={simulatedRate}
            onChange={(e) => setSimulatedRate(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-ew-resize accent-amber"
            aria-label="Simulate Lending Rate"
          />
          <div className="flex justify-between mono text-[10px] text-muted-dark">
            <span>3.0% (Bear)</span>
            <span>6.23% (Break-even)</span>
            <span>15.0% (Surge)</span>
          </div>
        </div>

        {/* Preset scenario pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.label}
              onClick={() => setSimulatedRate(sc.rate)}
              className={`mono text-[10px] tracking-[0.08em] px-2.5 py-1.5 border whitespace-nowrap transition-all ${
                Math.abs(simulatedRate - sc.rate) < 0.1
                  ? "border-amber bg-amber/15 text-amber font-medium"
                  : "border-white/10 text-muted hover:border-white/30 hover:text-foreground"
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two Strategy Interactive Cards ── */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* ── CARD 1: FIXED YIELD (PT) ── */}
        <div className="border border-white/15 hover:border-ice/50 rounded-xl bg-surface/80 p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-baseline gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-ice shrink-0" />
                <h3 className="m-0 text-[26px] sm:text-[30px] font-normal tracking-[-0.02em] text-ice">
                  Fixed Yield (PT)
                </h3>
              </div>
              <span className="mono text-[11px] tracking-[0.14em] text-ice border border-ice/30 px-2.5 py-0.5 rounded">
                6.42% APY LOCKED
              </span>
            </div>

            {/* Dynamic Return readout */}
            <div className="flex flex-col gap-1 pt-2 pb-1 border-b border-white/10">
              <span className="mono text-[11px] tracking-[0.14em] text-muted-dark uppercase">
                Guaranteed Payout on 26 Mar 2027
              </span>
              <div className="flex items-baseline gap-3">
                <span className="mono text-[32px] sm:text-[36px] font-medium text-foreground">
                  $
                  {fixedGrossReturn.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="mono text-[14px] text-ice font-medium">
                  +${fixedNetProfit.toFixed(2)} (+{fixedRoiPct.toFixed(2)}%)
                </span>
              </div>
              <span className="mono text-[11px] text-muted-dark">
                Immune to lending rate swings · Zero liquidation risk
              </span>
            </div>

            {/* Steady Chart Illustration */}
            <div className="relative py-2">
              <svg
                viewBox="0 0 520 120"
                className="w-full h-auto block"
                aria-hidden="true"
              >
                <path
                  d="M 0 100 H 520"
                  stroke="rgba(236,237,234,0.08)"
                  strokeWidth="1"
                />
                <path
                  d="M 470 10 V 100"
                  stroke="rgba(236,237,234,0.3)"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                />
                {/* Steady ascent */}
                <path
                  d="M 10 88 C 150 76, 320 44, 470 20"
                  stroke="#A9C8EE"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M 10 88 C 150 76, 320 44, 470 20 L 470 100 L 10 100 Z"
                  fill="rgba(169,200,238,0.06)"
                />
                <circle cx="470" cy="20" r="4.5" fill="#A9C8EE" />
                <text
                  className="mono"
                  x="476"
                  y="16"
                  fontSize="11"
                  fill="#A9C8EE"
                  fontWeight="500"
                >
                  $1.00 USDG
                </text>
                <text
                  className="mono"
                  x="12"
                  y="80"
                  fontSize="11"
                  fill="#8E9390"
                >
                  $0.941
                </text>
                <text
                  className="mono"
                  x="12"
                  y="20"
                  fontSize="10"
                  fill="#6F7471"
                  letterSpacing="0.1em"
                >
                  PREDICTABLE VALUE ACCRUAL
                </text>
              </svg>
            </div>

            <p className="m-0 text-[14px] sm:text-[15px] leading-[1.6] text-muted font-light">
              Your effective return is locked the moment you enter. Whether
              borrow demand collapses or skyrockets, you redeem 1:1 in USDG at
              maturity.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">Best for</span>
              <span className="text-foreground font-medium">
                Corporate treasuries &amp; risk-off yield
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">Early Exit</span>
              <span className="text-foreground">
                Sell PT anytime on AMM at market price
              </span>
            </div>
            <Link
              href="/trade?market=usdg-morpho-26mar27&side=fixed"
              className="mt-2 min-h-[44px] bg-ice text-[#0A0C10] font-medium text-[13px] flex items-center justify-center hover:bg-white transition-all shadow-[0_0_20px_rgba(169,200,238,0.2)]"
            >
              Lock Fixed Rate (PT) &rarr;
            </Link>
          </div>
        </div>

        {/* ── CARD 2: LONG YIELD (YT) ── */}
        <div className="border border-white/15 hover:border-amber/50 rounded-xl bg-surface/80 p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-baseline gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber shrink-0" />
                <h3 className="m-0 text-[26px] sm:text-[30px] font-normal tracking-[-0.02em] text-amber">
                  Long Yield (YT)
                </h3>
              </div>
              <span className="mono text-[11px] tracking-[0.14em] text-amber border border-amber/30 px-2.5 py-0.5 rounded">
                ~16.9x LEVERAGE
              </span>
            </div>

            {/* Dynamic Return readout reacting to slider */}
            <div className="flex flex-col gap-1 pt-2 pb-1 border-b border-white/10">
              <span className="mono text-[11px] tracking-[0.14em] text-muted-dark uppercase">
                Estimated Yield Streamed at {simulatedRate.toFixed(1)}% APY
              </span>
              <div className="flex items-baseline gap-3">
                <span className="mono text-[32px] sm:text-[36px] font-medium text-foreground">
                  $
                  {longGrossYield.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`mono text-[14px] font-medium ${
                    isLongProfitable ? "text-positive" : "text-negative"
                  }`}
                >
                  {isLongProfitable ? "+" : ""}${longNetProfit.toFixed(2)} (
                  {isLongProfitable ? "+" : ""}
                  {longRoiPct.toFixed(1)}%)
                </span>
              </div>
              <span className="mono text-[11px] text-muted-dark">
                Exposure to{" "}
                <span className="text-foreground">
                  ${longEffectiveNotional.toLocaleString()}
                </span>{" "}
                USDG vault interest
              </span>
            </div>

            {/* Dynamic Wavy Chart Illustration reacting to slider */}
            <div className="relative py-2">
              <svg
                viewBox="0 0 520 120"
                className="w-full h-auto block"
                aria-hidden="true"
              >
                <path
                  d="M 0 100 H 520"
                  stroke="rgba(236,237,234,0.08)"
                  strokeWidth="1"
                />
                {/* Break-even dotted line */}
                <path
                  d="M 0 65 H 520"
                  stroke="rgba(236,237,234,0.3)"
                  strokeWidth="1"
                  strokeDasharray="4 5"
                />
                <text
                  className="mono"
                  x="330"
                  y="58"
                  fontSize="10"
                  fill="#8E9390"
                >
                  BREAK-EVEN 6.23%
                </text>
                {/* Reactive wave */}
                <path
                  d={dynamicLongWave}
                  stroke="#F0A85C"
                  strokeWidth="2.2"
                  fill="none"
                  className="transition-all duration-300"
                />
                <text
                  className="mono"
                  x="12"
                  y="20"
                  fontSize="10"
                  fill="#F0A85C"
                  letterSpacing="0.1em"
                >
                  {simulatedRate >= BREAK_EVEN_RATE
                    ? "NET POSITIVE STREAM"
                    : "RATE BELOW BREAK-EVEN"}
                </text>
              </svg>
            </div>

            <p className="m-0 text-[14px] sm:text-[15px] leading-[1.6] text-muted font-light">
              Because YT costs ~$0.059 per token, you gain ~16.9x capital
              efficiency. When lending demand surges, your yield claimable
              multiplies dramatically.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">Best for</span>
              <span className="text-foreground font-medium">
                Yield speculation &amp; rate hedging
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">Payout mechanism</span>
              <span className="text-foreground">
                Claim streaming USDG continuously
              </span>
            </div>
            <Link
              href="/trade?market=usdg-morpho-26mar27&side=long"
              className="mt-2 min-h-[44px] bg-amber text-[#0A0C10] font-medium text-[13px] flex items-center justify-center hover:bg-white transition-all shadow-[0_0_20px_rgba(240,168,92,0.2)]"
            >
              Trade Long Yield (YT) &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
