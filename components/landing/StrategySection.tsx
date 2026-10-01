"use client";

import React from "react";

export function StrategySection() {
  return (
    <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 lg:pt-40">
      <div className="flex flex-col gap-5 sm:gap-6 max-w-[720px]">
        <div className="mono text-[12px] tracking-[0.18em] text-muted-dark">
          02 — PICK A SIDE
        </div>
        <h2 className="m-0 text-[36px] sm:text-[46px] lg:text-[60px] leading-[1.04] font-normal tracking-[-0.03em] text-balance">
          Know your number. Or bet on it.
        </h2>
      </div>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-2 border-t border-white/16">
        {/* Fixed Yield Column */}
        <div className="flex flex-col gap-6 py-10 md:pr-10 lg:pr-12 md:border-r border-white/16">
          <div className="flex justify-between items-baseline gap-4">
            <h3 className="m-0 text-[30px] sm:text-[32px] font-normal tracking-[-0.02em] text-ice">
              Fixed Yield
            </h3>
            <span className="mono text-[11px] tracking-[0.12em] text-muted-faint">
              ADVANCED: PT
            </span>
          </div>

          <svg
            viewBox="0 0 520 150"
            className="w-full h-auto block"
            aria-hidden="true"
          >
            <path
              d="M0 130 H520"
              stroke="rgba(236,237,234,0.12)"
              strokeWidth="1"
            />
            <path
              d="M470 10 V130"
              stroke="rgba(236,237,234,0.4)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
            <path
              d="M10 110 C150 98 320 66 470 34"
              stroke="#A9C8EE"
              strokeWidth="1.8"
              fill="none"
            />
            <circle cx="470" cy="34" r="4.5" fill="#A9C8EE" />
            <text
              className="mono"
              x="476"
              y="28"
              fontSize="12"
              fill="#A9C8EE"
            >
              1.00
            </text>
            <text
              className="mono"
              x="10"
              y="98"
              fontSize="12"
              fill="#8E9390"
            >
              0.97
            </text>
          </svg>

          <p className="m-0 text-[17px] sm:text-[18px] leading-[1.55] text-muted-light font-light">
            Your rate is set the moment you enter. Whatever the market does
            after, you know what you&apos;ll have on the end date.
          </p>

          <div className="flex flex-col border-t border-white/10 mt-2">
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">Good for</span>
              <span className="text-right text-foreground">
                Parking USDG at a known rate
              </span>
            </div>
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">Exit early</span>
              <span className="text-right text-foreground">
                Sell any time at the market price
              </span>
            </div>
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">At maturity</span>
              <span className="text-right text-foreground">
                Redeem 1 : 1 for USDG
              </span>
            </div>
          </div>
        </div>

        {/* Long Yield Column */}
        <div className="flex flex-col gap-6 py-10 md:pl-10 lg:pl-12 border-t md:border-t-0 border-white/16">
          <div className="flex justify-between items-baseline gap-4">
            <h3 className="m-0 text-[30px] sm:text-[32px] font-normal tracking-[-0.02em] text-amber">
              Long Yield
            </h3>
            <span className="mono text-[11px] tracking-[0.12em] text-muted-faint">
              ADVANCED: YT
            </span>
          </div>

          <svg
            viewBox="0 0 520 150"
            className="w-full h-auto block"
            aria-hidden="true"
          >
            <path
              d="M0 130 H520"
              stroke="rgba(236,237,234,0.12)"
              strokeWidth="1"
            />
            <path
              d="M0 78 H520"
              stroke="rgba(236,237,234,0.45)"
              strokeWidth="1"
              strokeDasharray="4 5"
            />
            <text
              className="mono"
              x="300"
              y="96"
              fontSize="12"
              fill="#8E9390"
            >
              BREAK-EVEN 6.23%
            </text>
            <path
              d="M10 84 C50 60 85 46 125 58 C165 70 185 104 230 96 C275 88 290 40 335 36 C380 32 395 66 430 62 C460 58 480 44 510 48"
              stroke="#F0A85C"
              strokeWidth="1.8"
              fill="none"
            />
            <text
              className="mono"
              x="300"
              y="24"
              fontSize="12"
              fill="#F0A85C"
            >
              THE REAL RATE
            </text>
          </svg>

          <p className="m-0 text-[17px] sm:text-[18px] leading-[1.55] text-muted-light font-light">
            A small amount buys the yield on a much larger balance. If the rate
            averages above break-even, you profit. If not, you lose part or most
            of what you paid.
          </p>

          <div className="flex flex-col border-t border-white/10 mt-2">
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">Good for</span>
              <span className="text-right text-foreground">
                A view that rates stay high
              </span>
            </div>
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">Along the way</span>
              <span className="text-right text-foreground">
                Claim yield as it comes in
              </span>
            </div>
            <div className="flex justify-between gap-4 py-3.5 border-b border-white/10 text-[15px]">
              <span className="text-muted-dark">At maturity</span>
              <span className="text-right text-foreground">
                Ends at zero; nothing to redeem
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
