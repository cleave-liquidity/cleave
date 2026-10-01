"use client";

import React from "react";

export function StrategySection() {
  return (
    <section
      className="relative max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 lg:pt-40"
    >
      <div className="flex flex-col gap-5 sm:gap-6 max-w-[720px]">
        <div className="mono flex items-center gap-2 text-[11px] tracking-[0.22em] text-muted-dark uppercase">
          <span className="w-1 h-1 rounded-full bg-foreground/30 shrink-0" />
          02 — PICK A SIDE
        </div>
        <h2 className="m-0 text-[36px] sm:text-[46px] lg:text-[60px] leading-[1.04] font-normal tracking-[-0.03em] text-balance">
          Know your number.
          <br />
          <span className="text-muted">Or bet on it.</span>
        </h2>
        <p className="m-0 text-[17px] leading-[1.6] text-muted font-light max-w-[560px]">
          Both paths use the same USDG vault. One locks your return in advance.
          The other bets that the variable rate stays high enough to pay off.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 border-t border-white/10">
        {/* Fixed Yield Column */}
        <div className="flex flex-col gap-6 py-10 md:pr-10 lg:pr-14 md:border-r border-white/10 border-b md:border-b-0">
          <div className="flex justify-between items-baseline gap-4">
            <h3 className="m-0 text-[28px] sm:text-[32px] font-normal tracking-[-0.02em] text-ice">
              Fixed Yield
            </h3>
            <span className="mono text-[11px] tracking-[0.12em] text-muted-dark border border-white/10 px-2 py-0.5">
              PT
            </span>
          </div>

          {/* Mini chart */}
          <svg viewBox="0 0 520 120" className="w-full h-auto block" aria-hidden="true">
            <path d="M0 100 H520" stroke="rgba(236,237,234,0.08)" strokeWidth="1" />
            <path d="M470 8 V100" stroke="rgba(236,237,234,0.3)" strokeWidth="1" strokeDasharray="3 5" />
            {/* Steady line rising to maturity */}
            <path d="M10 88 C150 76 320 44 470 18" stroke="#A9C8EE" strokeWidth="1.8" fill="none" />
            {/* Fill under line */}
            <path d="M10 88 C150 76 320 44 470 18 L470 100 L10 100 Z" fill="rgba(169,200,238,0.04)" />
            <circle cx="470" cy="18" r="4" fill="#A9C8EE" />
            <text className="mono" x="476" y="14" fontSize="11" fill="#A9C8EE">1.00 USDG</text>
            <text className="mono" x="10" y="80" fontSize="11" fill="#6F7471">0.941</text>
            <text className="mono" x="10" y="18" fontSize="10" fill="#6F7471" letterSpacing="0.1em">PRICE RISES TO MATURITY</text>
          </svg>

          <p className="m-0 text-[16px] sm:text-[17px] leading-[1.6] text-muted font-light">
            Your rate is set the moment you enter. Whatever the market does
            after, you know exactly what you&apos;ll have on the end date.
          </p>

          <div className="flex flex-col border-t border-white/10 mt-1">
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">Good for</span>
              <span className="text-right text-foreground">Parking USDG at a known rate</span>
            </div>
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">Exit early</span>
              <span className="text-right text-foreground">Sell any time at market price</span>
            </div>
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">At maturity</span>
              <span className="text-right text-ice">Redeem 1 : 1 for USDG</span>
            </div>
          </div>
        </div>

        {/* Long Yield Column */}
        <div className="flex flex-col gap-6 py-10 md:pl-10 lg:pl-14">
          <div className="flex justify-between items-baseline gap-4">
            <h3 className="m-0 text-[28px] sm:text-[32px] font-normal tracking-[-0.02em] text-amber">
              Long Yield
            </h3>
            <span className="mono text-[11px] tracking-[0.12em] text-muted-dark border border-white/10 px-2 py-0.5">
              YT
            </span>
          </div>

          {/* Mini chart */}
          <svg viewBox="0 0 520 120" className="w-full h-auto block" aria-hidden="true">
            <path d="M0 100 H520" stroke="rgba(236,237,234,0.08)" strokeWidth="1" />
            <path d="M0 55 H520" stroke="rgba(236,237,234,0.3)" strokeWidth="1" strokeDasharray="4 5" />
            <text className="mono" x="330" y="48" fontSize="11" fill="#6F7471">BREAK-EVEN 6.23%</text>
            {/* Wavy rate line */}
            <path
              d="M10 60 C50 38 85 24 125 36 C165 48 185 82 230 72 C275 62 290 16 335 12 C380 8 395 44 430 40 C460 36 480 22 510 28"
              stroke="#F0A85C"
              strokeWidth="1.8"
              fill="none"
            />
            <text className="mono" x="10" y="18" fontSize="10" fill="#6F7471" letterSpacing="0.1em">THE REAL RATE · VOLATILE</text>
          </svg>

          <p className="m-0 text-[16px] sm:text-[17px] leading-[1.6] text-muted font-light">
            A small amount buys the yield on a much larger balance. If the rate
            averages above break-even, you profit. If not, you lose part or most
            of what you paid.
          </p>

          <div className="flex flex-col border-t border-white/10 mt-1">
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">Good for</span>
              <span className="text-right text-foreground">A view that rates stay high</span>
            </div>
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">Along the way</span>
              <span className="text-right text-foreground">Claim yield as it comes in</span>
            </div>
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">At maturity</span>
              <span className="text-right text-amber">Ends at zero; nothing to redeem</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
