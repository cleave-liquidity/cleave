"use client";

import React from "react";
import Link from "next/link";

export function MaturityPreview() {
  return (
    <section
      id="portfolio"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 lg:pt-40"
    >
      <div className="flex flex-col gap-5 sm:gap-6 max-w-[720px]">
        <div className="mono text-[12px] tracking-[0.18em] text-muted-dark">
          05 — TO MATURITY
        </div>
        <h2 className="m-0 text-[36px] sm:text-[46px] lg:text-[60px] leading-[1.04] font-normal tracking-[-0.03em] text-balance">
          Watch both paths arrive.
        </h2>
      </div>

      {/* Progress Track */}
      <div className="mt-14 flex flex-col gap-3.5">
        <div className="mono flex justify-between gap-3 flex-wrap text-[12px] tracking-[0.12em] text-muted-dark">
          <span>OPENED 02 OCT 2026</span>
          <span className="text-foreground font-medium">DAY 57 · 118 LEFT</span>
          <span>MATURITY 26 MAR 2027</span>
        </div>
        <div className="relative h-[2px] bg-white/14">
          <div
            className="absolute left-0 top-0 h-[2px] bg-foreground"
            style={{ width: "32.6%" }}
          />
          <div
            className="absolute top-[-6px] w-3.5 h-3.5 -ml-[7px] rounded-full bg-background border-2 border-foreground"
            style={{ left: "32.6%" }}
          />
        </div>
      </div>

      {/* Position Cards */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Fixed Position Card */}
        <div className="border border-white/16 border-t-2 border-t-ice rounded-[10px] bg-surface p-5 sm:p-7.5 flex flex-col gap-5">
          <div className="flex justify-between items-baseline gap-3">
            <span className="text-[20px] text-foreground">Fixed · USDG</span>
            <span className="mono text-[12px] tracking-[0.12em] text-ice">
              LOCKED 6.38%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted-dark">Paid</span>
              <span className="mono text-[18px] text-foreground">1,000.00</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted-dark">Value now</span>
              <span className="mono text-[18px] text-foreground">1,009.56</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted-dark">At maturity</span>
              <span className="mono text-[18px] text-ice">1,030.08</span>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap pt-1">
            <button
              type="button"
              disabled
              className="min-h-[46px] px-5 border border-white/16 rounded-lg bg-transparent text-muted-dark text-[15px] cursor-not-allowed"
            >
              Redeem · opens 26 Mar
            </button>
            <Link
              href="/portfolio"
              className="min-h-[46px] px-5 border border-white/40 rounded-lg bg-transparent text-foreground text-[15px] flex items-center justify-center hover:border-white transition-colors"
            >
              Sell early
            </Link>
          </div>
        </div>

        {/* Long Position Card */}
        <div className="border border-white/16 border-t-2 border-t-amber rounded-[10px] bg-surface p-5 sm:p-7.5 flex flex-col gap-5">
          <div className="flex justify-between items-baseline gap-3">
            <span className="text-[20px] text-foreground">Long · USDG</span>
            <span className="mono text-[12px] tracking-[0.12em] text-amber">
              RATE NOW 7.10%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted-dark">Paid</span>
              <span className="mono text-[18px] text-foreground">100.00</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted-dark">Position value</span>
              <span className="mono text-[18px] text-foreground">67.74</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted-dark">Claimable</span>
              <span className="mono text-[18px] text-amber">36.63</span>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap pt-1">
            <Link
              href="/portfolio"
              className="min-h-[46px] px-5 border-0 rounded-lg bg-amber text-[#0A0B0C] text-[15px] font-medium flex items-center justify-center hover:brightness-105 transition-all"
            >
              Claim 36.63 USDG
            </Link>
            <Link
              href="/portfolio"
              className="min-h-[46px] px-5 border border-white/40 rounded-lg bg-transparent text-foreground text-[15px] flex items-center justify-center hover:border-white transition-colors"
            >
              Sell early
            </Link>
          </div>
        </div>
      </div>

      <p className="mono m-0 mt-4.5 text-[12px] tracking-[0.06em] text-muted-faint">
        Illustration of the two positions above on day 57, rate unchanged at
        7.10%.
      </p>
    </section>
  );
}
