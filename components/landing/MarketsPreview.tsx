"use client";

import React from "react";
import Link from "next/link";
import { formatUsd } from "@/lib/utils/formatters";

const SAMPLE_ROWS = [
  {
    id: "usdg-morpho-26mar27",
    symbol: "USDG",
    name: "Paxos dollar",
    source: "Morpho lending vault",
    fixedRate: "6.42%",
    rateNow: "7.10%",
    maturity: "26 Mar 2027",
    days: "175 DAYS",
    liquidity: 4_200_000,
    status: "Active",
    statusColor: "#A9C8EE",
  },
  {
    id: "susde-ethena-24jun27",
    symbol: "sUSDe",
    name: "Staked USDe",
    source: "Ethena staking",
    fixedRate: "8.90%",
    rateNow: "9.85%",
    maturity: "24 Jun 2027",
    days: "265 DAYS",
    liquidity: 2_700_000,
    status: "Active",
    statusColor: "#A9C8EE",
  },
  {
    id: "snet-netnet-17dec26",
    symbol: "sNET",
    name: "Staked NET",
    source: "NetNet staking",
    fixedRate: "5.95%",
    rateNow: "5.40%",
    maturity: "17 Dec 2026",
    days: "76 DAYS",
    liquidity: 900_000,
    status: "Maturing soon",
    statusColor: "#F0A85C",
  },
];

export function MarketsPreview() {
  return (
    <section
      id="markets"
      className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 lg:pt-40"
    >
      <div className="flex justify-between items-end gap-6 flex-wrap">
        <div className="flex flex-col gap-5 sm:gap-6">
          <div className="mono text-[12px] tracking-[0.18em] text-muted-dark">
            03 — MARKETS
          </div>
          <h2 className="m-0 text-[36px] sm:text-[46px] lg:text-[60px] leading-[1.04] font-normal tracking-[-0.03em]">
            Every market has
            <br />a real yield source.
          </h2>
        </div>
        <div className="flex items-center gap-4.5 flex-wrap">
          <span className="mono text-[12px] tracking-[0.12em] text-[#0A0B0C] bg-[#B9BDBA] px-2.5 py-1.5 font-medium">
            SAMPLE DATA · NOT LIVE
          </span>
          <Link
            href="/markets"
            className="text-[15px] inline-flex gap-2 items-center min-h-[44px] text-foreground hover:text-white transition-colors"
          >
            All markets <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="mt-12 overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="mono grid grid-cols-[2.1fr_1.5fr_1fr_1fr_1.25fr_1fr_1.1fr] gap-4 px-5 pb-3.5 text-[12px] tracking-[0.12em] text-muted-dark border-b border-white/16">
            <span>ASSET</span>
            <span>YIELD SOURCE</span>
            <span className="text-right">FIXED RATE</span>
            <span className="text-right">RATE NOW</span>
            <span className="text-right">MATURES</span>
            <span className="text-right">LIQUIDITY</span>
            <span className="text-right">STATUS</span>
          </div>

          {SAMPLE_ROWS.map((row) => (
            <Link
              key={row.id}
              href={`/markets/${row.id}`}
              className="grid grid-cols-[2.1fr_1.5fr_1fr_1fr_1.25fr_1fr_1.1fr] gap-4 items-center px-5 py-6 sm:py-6.5 border-b border-white/10 text-foreground hover:bg-white/[0.02] transition-colors group"
            >
              <span className="flex items-center gap-3.5">
                <span className="mono w-[38px] h-[38px] border border-white/30 rounded-full flex items-center justify-center text-[10px] text-muted group-hover:border-white/50 transition-colors">
                  {row.symbol}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-[18px] group-hover:text-white transition-colors">
                    {row.symbol}
                  </span>
                  <span className="text-[13px] text-muted-dark">{row.name}</span>
                </span>
              </span>

              <span className="text-[15px] text-muted">{row.source}</span>

              <span className="mono text-right text-[18px] text-ice">
                {row.fixedRate}
              </span>

              <span className="mono text-right text-[16px] text-muted">
                {row.rateNow}
              </span>

              <span className="text-right flex flex-col gap-1">
                <span className="text-[15px]">{row.maturity}</span>
                <span className="mono text-[12px] text-muted-dark">
                  {row.days}
                </span>
              </span>

              <span className="mono text-right text-[15px] text-muted">
                {formatUsd(row.liquidity)}
              </span>

              <span className="text-right flex justify-end items-center gap-2 text-[14px] text-muted-light">
                <span
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: row.statusColor }}
                />
                {row.status}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <p className="mono m-0 mt-4.5 text-[12px] tracking-[0.06em] text-muted-faint">
        Fixed rate is the market rate before price impact. Rate now is today&apos;s
        variable rate.
      </p>
    </section>
  );
}
