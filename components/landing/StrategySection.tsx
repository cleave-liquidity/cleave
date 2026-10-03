"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useFixedYieldQuote } from "@/hooks/useFixedYieldQuote";
import { useLongYieldQuote } from "@/hooks/useLongYieldQuote";
import { useMarkets } from "@/hooks/useMarkets";
import { formatApy } from "@/lib/utils/formatters";
import { DEFAULT_TICKET, marketHref, pickFeaturedMarket } from "./featuredMarket";

export function StrategySection() {
  // ─── Data: featured market + shared quotes through the existing hooks ───
  const { markets } = useMarkets();
  const market = useMemo(() => pickFeaturedMarket(markets), [markets]);
  const { quote: fixedQuote } = useFixedYieldQuote(market?.id ?? "", DEFAULT_TICKET);
  const { quote: longQuote } = useLongYieldQuote(market?.id ?? "", DEFAULT_TICKET);

  const symbol = market?.symbol ?? "—";
  const maturity = market?.maturity ?? "—";
  const impliedApy = market?.impliedApy ?? 0;
  const underlyingApy = market?.underlyingApy ?? 0;
  const YEAR_FRAC = market ? Math.max(market.daysRemaining, 1) / 365 : 0;
  const FIXED_APY = fixedQuote?.quotedFixedApy ?? (market ? impliedApy : 0);
  const BREAK_EVEN_RATE = longQuote?.estimatedBreakEvenApy ?? (market ? impliedApy : 0);
  // Exposure bought per unit paid for YT. From the quote when there is one; otherwise estimated from the
  // implied rate the same way the quote engine prices it.
  const ytPrice =
    longQuote && longQuote.ytPrice > 0
      ? longQuote.ytPrice
      : market
        ? 1 - 1 / (1 + (impliedApy / 100) * YEAR_FRAC)
        : 0;
  const LEVERAGE = ytPrice > 0 ? 1 / ytPrice : 0;
  const ptPriceLabel = market
    ? (fixedQuote?.ptPrice ?? 1 / (1 + (impliedApy / 100) * YEAR_FRAC)).toFixed(3)
    : "—";

  // The simulated rate starts at the market's current rate until the slider is touched.
  const centre = market ? (underlyingApy > 0 ? underlyingApy : impliedApy) : 0;
  const sliderMax = Math.max(15, Math.ceil(centre * 2));
  const SCENARIOS = [
    { label: `Rate Drop (${(centre * 0.55).toFixed(1)}%)`, rate: Number((centre * 0.55).toFixed(1)) },
    { label: `Current (${centre.toFixed(1)}%)`, rate: Number(centre.toFixed(1)) },
    { label: `Rate Surge (${(centre * 1.7).toFixed(1)}%)`, rate: Number(Math.min(sliderMax, centre * 1.7).toFixed(1)) },
  ];
  const [rateOverride, setSimulatedRate] = useState<number | null>(null);
  const simulatedRate = rateOverride ?? Number(centre.toFixed(1));
  // Reference deposit amount (simulated capital, in dollars)
  const [depositAmount, setDepositAmount] = useState<number>(1000);

  // Calculations for Fixed Yield (PT):
  // Buy at discount, redeem at 1.0. Fixed return is locked regardless of rate!
  const fixedGrossReturn = useMemo(() => {
    const lockedYield = depositAmount * (FIXED_APY / 100) * YEAR_FRAC;
    return depositAmount + lockedYield;
  }, [depositAmount, FIXED_APY, YEAR_FRAC]);

  const fixedNetProfit = fixedGrossReturn - depositAmount;
  const fixedRoiPct = (fixedNetProfit / depositAmount) * 100;

  // Calculations for Long Yield (YT):
  // YT costs a fraction of the underlying, so each unit paid buys 1 / ytPrice of yield-bearing exposure.
  const longEffectiveNotional = depositAmount * LEVERAGE;
  const longGrossYield = useMemo(() => {
    return longEffectiveNotional * (simulatedRate / 100) * YEAR_FRAC;
  }, [longEffectiveNotional, simulatedRate, YEAR_FRAC]);

  const longNetProfit = longGrossYield - depositAmount;
  const longRoiPct = (longNetProfit / depositAmount) * 100;
  const isLongProfitable = longNetProfit >= 0;

  // Dynamic SVG path for Long Yield wave that reacts to simulatedRate
  const dynamicLongWave = useMemo(() => {
    // Amplitude scales with rate (higher rate = higher oscillation & higher center)
    const baseAmp = 12 + (simulatedRate / sliderMax) * 24;
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
  }, [simulatedRate, BREAK_EVEN_RATE, sliderMax]);

  if (!market) {
    return (
      <section
        id="strategy"
        className="relative mx-auto max-w-[1240px] px-4 pt-24 sm:px-6 sm:pt-32 lg:px-10 lg:pt-40"
      >
        <div className="border-y border-white/10 py-8">
          <div className="mono flex items-center gap-2 text-[11px] tracking-[0.22em] text-muted uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />
            02 — INTERACTIVE SIMULATOR
          </div>
          <p className="mt-4 max-w-[620px] text-[15px] leading-7 text-muted">
            Live market data is unavailable right now. Browse Markets to choose a current yield market.
          </p>
          <Link href="/markets" className="mt-4 inline-flex text-[14px] text-ice hover:text-white">
            Browse Markets →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      id="strategy"
      className="relative max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 lg:pt-40 select-none"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div data-reveal className="flex flex-col gap-4 max-w-[680px]">
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
        <div data-reveal="1" className="flex flex-col gap-2">
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
      <div data-reveal className="mt-8 p-5 sm:p-6 bg-surface/70 border border-white/10 rounded-xl backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-5">
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
            <span className="text-amber">{formatApy(BREAK_EVEN_RATE)}</span>
          </span>
        </div>

        {/* Slider Input */}
        <div className="flex-1 w-full max-w-[480px] flex flex-col gap-2">
          <input
            type="range"
            min="0"
            max={sliderMax}
            step="0.1"
            value={simulatedRate}
            onChange={(e) => setSimulatedRate(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-ew-resize accent-amber"
            aria-label="Simulate Lending Rate"
          />
          <div className="flex justify-between mono text-[10px] text-muted-dark">
            <span>0.0% (Bear)</span>
            <span>{formatApy(BREAK_EVEN_RATE)} (Break-even)</span>
            <span>{sliderMax.toFixed(1)}% (Surge)</span>
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
      <div data-reveal="1" className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
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
                {formatApy(FIXED_APY)} APY LOCKED
              </span>
            </div>

            {/* Dynamic Return readout */}
            <div className="flex flex-col gap-1 pt-2 pb-1 border-b border-white/10">
              <span className="mono text-[11px] tracking-[0.14em] text-muted-dark uppercase">
                Guaranteed Payout on {maturity}
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
                  1.00 {symbol}
                </text>
                <text
                  className="mono"
                  x="12"
                  y="80"
                  fontSize="11"
                  fill="#8E9390"
                >
                  {ptPriceLabel}
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
              borrow demand collapses or skyrockets, you redeem 1:1 in {symbol} at
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
              href={market ? marketHref(market.id, "fixed") : "/markets"}
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
                ~{LEVERAGE.toFixed(1)}x LEVERAGE
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
                {symbol} vault interest
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
                  BREAK-EVEN {formatApy(BREAK_EVEN_RATE)}
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
              Because YT costs ~{ytPrice.toFixed(3)} {symbol} per token, you gain ~{LEVERAGE.toFixed(1)}x capital
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
                Claim streaming {symbol} continuously
              </span>
            </div>
            <Link
              href={market ? marketHref(market.id, "long") : "/markets"}
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
