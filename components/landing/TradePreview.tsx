"use client";

import React, { useState } from "react";
import Link from "next/link";

export function TradePreview() {
  const [strategy, setStrategy] = useState<"fixed" | "long">("fixed");
  const isFixed = strategy === "fixed";

  return (
    <section
      id="trade"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 lg:pt-40"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-start">
        {/* Left Information */}
        <div className="flex flex-col gap-5 sm:gap-6">
          <div className="mono text-[12px] tracking-[0.18em] text-muted-dark">
            04 — OPEN A POSITION
          </div>
          <h2 className="m-0 text-[36px] sm:text-[46px] lg:text-[60px] leading-[1.04] font-normal tracking-[-0.03em] text-balance">
            Same market.
            <br />
            Pick a side.
          </h2>
          <p className="m-0 text-[17px] sm:text-[18px] leading-[1.6] text-muted font-light max-w-[460px]">
            Fixed tells you what you&apos;ll have on the end date. Long tells you
            what the rate has to do, and what happens if it doesn&apos;t.
          </p>

          <div className="flex flex-col mt-4 border-t border-white/12">
            <div className="flex gap-4.5 py-4 border-b border-white/12 text-[16px]">
              <span className="mono text-muted-faint">01</span>
              <span>Choose Fixed or Long</span>
            </div>
            <div className="flex gap-4.5 py-4 border-b border-white/12 text-[16px]">
              <span className="mono text-muted-faint">02</span>
              <span>Enter an amount in USDG</span>
            </div>
            <div className="flex gap-4.5 py-4 border-b border-white/12 text-[16px]">
              <span className="mono text-muted-faint">03</span>
              <span>Approve USDG once, then confirm</span>
            </div>
          </div>
        </div>

        {/* Right Interactive Preview Card */}
        <div className="border border-white/16 rounded-[10px] bg-surface p-5 sm:p-8 flex flex-col gap-5.5">
          <div className="flex justify-between items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[18px] font-medium text-foreground">
                USDG · Morpho lending vault
              </span>
              <span className="mono text-[12px] text-muted-dark">
                ENDS 26 MAR 2027 · 175 DAYS
              </span>
            </div>
            <span className="mono text-[11px] tracking-[0.12em] text-muted-dark border border-white/20 rounded-full px-2.5 py-1">
              PREVIEW
            </span>
          </div>

          {/* Strategy Tabs */}
          <div
            role="group"
            aria-label="Strategy"
            className="grid grid-cols-2 border border-white/18 rounded-lg overflow-hidden"
          >
            <button
              type="button"
              aria-pressed={isFixed}
              onClick={() => setStrategy("fixed")}
              className={`min-h-[48px] border-0 text-[15px] font-medium transition-colors cursor-pointer ${
                isFixed
                  ? "bg-ice text-[#0A0B0C]"
                  : "bg-transparent text-muted hover:text-white"
              }`}
            >
              Fixed yield
            </button>
            <button
              type="button"
              aria-pressed={!isFixed}
              onClick={() => setStrategy("long")}
              className={`min-h-[48px] border-0 text-[15px] font-medium transition-colors cursor-pointer ${
                !isFixed
                  ? "bg-amber text-[#0A0B0C]"
                  : "bg-transparent text-muted hover:text-white"
              }`}
            >
              Long yield
            </button>
          </div>

          {/* Pay Input */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between text-[14px] text-muted-dark">
              <label htmlFor="pay-input">You pay</label>
              <span className="mono text-[12px]">BALANCE 2,500.00 USDG</span>
            </div>
            <div className="flex items-center justify-between gap-3 border border-white/18 rounded-lg bg-surface-raised px-4.5 min-h-[64px]">
              <input
                id="pay-input"
                readOnly
                value={isFixed ? "1,000.00" : "100.00"}
                className="mono flex-grow min-w-0 bg-transparent border-0 text-foreground text-[26px] outline-none"
              />
              <span className="text-[16px] text-muted">USDG</span>
            </div>
          </div>

          {/* Fixed Mode Output */}
          {isFixed ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5 pt-4 pb-1">
                <span className="text-[14px] text-muted-dark">
                  You&apos;ll have on 26 Mar 2027
                </span>
                <span className="mono text-[36px] sm:text-[40px] tracking-[-0.02em] text-foreground">
                  1,030.08 <span className="text-[18px] text-muted">USDG</span>
                </span>
                <span className="mono text-[14px] text-ice">
                  +30.08 USDG · locked 6.38%
                </span>
              </div>

              <div className="flex flex-col text-[15px]">
                <div className="flex justify-between gap-4 py-3 border-y border-white/10">
                  <span className="text-muted-dark">Market rate</span>
                  <span className="mono text-foreground">6.42%</span>
                </div>
                <div className="flex justify-between gap-4 py-3 border-b border-white/10">
                  <span className="text-muted-dark">Price impact</span>
                  <span className="mono text-foreground">0.02%</span>
                </div>
                <div className="flex justify-between gap-4 py-3 border-b border-white/10">
                  <span className="text-muted-dark">Network fee</span>
                  <span className="text-muted">
                    Shown in ETH before you confirm
                  </span>
                </div>
                <div className="flex justify-between gap-4 py-3 text-[13px]">
                  <span className="mono text-muted-faint tracking-[0.1em]">
                    ADVANCED
                  </span>
                  <span className="mono text-muted-dark">
                    1,030.08 PT-USDG @ 0.9708
                  </span>
                </div>
              </div>

              <Link
                href="/markets/usdg-morpho-26mar27"
                className="min-h-[56px] border-0 rounded-lg bg-ice text-[#0A0B0C] text-[16px] font-medium flex items-center justify-center hover:brightness-105 transition-all"
              >
                Open fixed position
              </Link>
            </div>
          ) : (
            /* Long Mode Output */
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5 pt-4 pb-1">
                <span className="text-[14px] text-muted-dark">
                  You earn the yield on
                </span>
                <span className="mono text-[36px] sm:text-[40px] tracking-[-0.02em] text-foreground">
                  ~3,402 <span className="text-[18px] text-muted">USDG</span>
                </span>
                <span className="mono text-[14px] text-amber">
                  until 26 Mar 2027 · break-even 6.23%
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <span className="mono text-[12px] tracking-[0.12em] text-muted-dark">
                  IF THE RATE AVERAGES… YOU COLLECT
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="border border-white/14 rounded-lg p-3.5 flex flex-col gap-1.5">
                    <span className="mono text-[13px] text-muted-dark">
                      7.10% · rate now
                    </span>
                    <span className="mono text-[20px] text-foreground">
                      ~113.73
                    </span>
                    <span className="mono text-[13px] text-positive">
                      +13.7%
                    </span>
                  </div>
                  <div className="border border-white/14 rounded-lg p-3.5 flex flex-col gap-1.5">
                    <span className="mono text-[13px] text-muted-dark">
                      5.00% · rate falls
                    </span>
                    <span className="mono text-[20px] text-foreground">
                      ~80.51
                    </span>
                    <span className="mono text-[13px] text-negative">
                      −19.5% loss
                    </span>
                  </div>
                </div>

                <p className="m-0 p-3 sm:p-3.5 border border-amber/35 rounded-lg text-[13px] leading-[1.5] text-muted-light">
                  Long Yield ends at zero on 26 Mar 2027. You keep only the
                  yield collected before then, so you can lose most of the 100
                  USDG.
                </p>
              </div>

              <div className="flex justify-between gap-4 py-1 text-[13px]">
                <span className="mono text-muted-faint tracking-[0.1em]">
                  ADVANCED
                </span>
                <span className="mono text-muted-dark">
                  3,402 YT-USDG @ 0.0294
                </span>
              </div>

              <Link
                href="/markets/usdg-morpho-26mar27"
                className="min-h-[56px] border-0 rounded-lg bg-amber text-[#0A0B0C] text-[16px] font-medium flex items-center justify-center hover:brightness-105 transition-all"
              >
                Open long position
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
