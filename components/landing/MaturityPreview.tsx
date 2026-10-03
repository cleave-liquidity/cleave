"use client";

import React, { useState } from "react";
import Link from "next/link";

export function MaturityPreview() {
  const [claimed, setClaimed] = useState(false);

  return (
    <section
      id="portfolio"
      className="relative max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 lg:pt-40 select-none"
    >
      <div data-reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="flex flex-col gap-4 max-w-[680px]">
          <div className="mono flex items-center gap-2 text-[11px] tracking-[0.22em] text-muted uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-ice shrink-0" />
            05 — LIVE PORTFOLIO SIMULATION
          </div>
          <h2 className="m-0 text-[36px] sm:text-[48px] lg:text-[60px] leading-[1.04] font-normal tracking-[-0.035em] text-balance">
            Watch both paths
            <br />
            <span className="text-muted">arrive at maturity.</span>
          </h2>
        </div>
        <p className="m-0 text-[14px] sm:text-[15px] leading-[1.6] text-muted font-light max-w-[420px]">
          Simulating two open positions on Day 57 of 175. Track real-time value accrual and
          streaming interest yield.
        </p>
      </div>

      {/* ── Precision Timeline Progress Track ── */}
      <div data-reveal="1" className="mt-10 p-5 rounded-2xl bg-surface/80 border border-white/10 flex flex-col gap-4">
        <div className="mono flex justify-between items-center text-[11px] tracking-[0.14em] text-muted-dark flex-wrap gap-2">
          <span>ORIGIN: 02 OCT 2026</span>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-foreground font-medium">
            <span className="w-2 h-2 rounded-full bg-ice animate-pulse" />
            <span>CURRENT: DAY 57 · 118 DAYS LEFT (32.6%)</span>
          </div>
          <span>MATURITY: 26 MAR 2027</span>
        </div>

        {/* Progress Bar with glowing head */}
        <div className="relative h-2 w-full bg-white/10 rounded-full overflow-visible">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-ice/40 to-ice rounded-full"
            style={{ width: "32.6%" }}
          />
          {/* Active Ping Node */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 -ml-2 rounded-full bg-background border-2 border-ice shadow-[0_0_12px_rgba(59,134,255,0.8)]"
            style={{ left: "32.6%" }}
          />
        </div>

        <div className="flex justify-between mono text-[10px] text-muted-dark pt-1">
          <span>Position Minted</span>
          <span className="text-ice">Accruing Value</span>
          <span>1:1 Settlement</span>
        </div>
      </div>

      {/* ── Position Cards Grid ── */}
      <div data-reveal="1" className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Fixed Yield Position Card */}
        <div className="border border-white/15 hover:border-ice/50 rounded-2xl bg-surface/90 backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all">
          <div className="flex flex-col gap-5">
            <div className="flex justify-between items-baseline gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-ice shrink-0" />
                <span className="text-[18px] font-medium text-foreground">Fixed · USDG (PT)</span>
              </div>
              <span className="mono text-[11px] tracking-[0.12em] text-ice border border-ice/30 px-2 py-0.5 rounded">
                LOCKED 6.38% APY
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-surface-raised rounded-xl border border-white/8">
              <div className="flex flex-col gap-1">
                <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">Invested</span>
                <span className="mono text-[18px] font-medium text-foreground">$1,000.00</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">Current Value</span>
                <span className="mono text-[18px] font-medium text-foreground">$1,009.56</span>
                <span className="mono text-[10px] text-ice">+0.96%</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">At Maturity</span>
                <span className="mono text-[18px] font-medium text-ice">$1,030.08</span>
                <span className="mono text-[10px] text-ice">+3.01% Net</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[13px] text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-ice/60 shrink-0" />
              <span>Token balance: 1,030.08 PT-USDG steadily appreciating toward 1.00 USDG.</span>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap pt-2 border-t border-white/10">
            <button
              type="button"
              disabled
              className="flex-1 min-h-[46px] px-4 border border-white/10 rounded-xl bg-white/5 text-muted text-[13px] mono font-medium cursor-not-allowed text-center"
            >
              Redeem (Matures in 118d)
            </button>
            <Link
              href="/portfolio"
              className="min-h-[46px] px-5 border border-white/20 rounded-xl bg-transparent text-foreground hover:border-white text-[13px] font-medium flex items-center justify-center transition-colors"
            >
              Sell Early on AMM &rarr;
            </Link>
          </div>
        </div>

        {/* Long Yield Position Card */}
        <div className="border border-white/15 hover:border-amber/50 rounded-2xl bg-surface/90 backdrop-blur-md p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all">
          <div className="flex flex-col gap-5">
            <div className="flex justify-between items-baseline gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber shrink-0" />
                <span className="text-[18px] font-medium text-foreground">Long · USDG (YT)</span>
              </div>
              <span className="mono text-[11px] tracking-[0.12em] text-amber border border-amber/30 px-2 py-0.5 rounded">
                RATE NOW: 7.10%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-surface-raised rounded-xl border border-white/8">
              <div className="flex flex-col gap-1">
                <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">Cost Paid</span>
                <span className="mono text-[18px] font-medium text-foreground">$100.00</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">Remaining Value</span>
                <span className="mono text-[18px] font-medium text-foreground">$67.74</span>
                <span className="mono text-[10px] text-muted-dark">Ends at $0</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">Yield Streamed</span>
                <span className="mono text-[18px] font-medium text-amber">
                  {claimed ? "$0.00" : "$36.63"}
                </span>
                <span className="mono text-[10px] text-positive">Claimable</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[13px] text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-amber/60 shrink-0" />
              <span>
                Streaming rate: ~0.64 USDG/day from $1,690 underlying Morpho lending vault.
              </span>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setClaimed(true)}
              disabled={claimed}
              className={`flex-1 min-h-[46px] px-4 rounded-xl text-[13px] font-medium transition-all shadow-[0_2px_14px_rgba(239,95,34,0.2)] ${
                claimed
                  ? "bg-white/10 text-muted border border-white/10 cursor-not-allowed"
                  : "bg-amber text-[#0A0C10] cursor-pointer hover:brightness-110 hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(239,95,34,0.5)] active:translate-y-0 active:brightness-95"
              }`}
            >
              {claimed ? "Yield Claimed (36.63 USDG)" : "Claim 36.63 USDG Yield"}
            </button>
            <Link
              href="/portfolio"
              className="min-h-[46px] px-5 border border-white/20 rounded-xl bg-transparent text-foreground hover:border-white text-[13px] font-medium flex items-center justify-center transition-colors"
            >
              Exit Position &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
