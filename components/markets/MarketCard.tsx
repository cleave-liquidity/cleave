"use client";

import React from "react";
import Link from "next/link";
import { YieldMarket } from "@/types/market";
import { formatApy, formatUsd } from "@/lib/utils/formatters";

export function MarketCard({ market }: { market: YieldMarket }) {
  const isMaturing = market.status === "maturing";

  return (
    <Link
      href={`/markets/${market.id}`}
      className="block border border-white/14 rounded-[10px] bg-surface p-4 sm:p-5 hover:border-white/30 transition-all group"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="mono w-9 h-9 border border-white/20 rounded-full flex items-center justify-center text-[10px] text-muted group-hover:border-white/40">
            {market.symbol}
          </div>
          <div>
            <div className="text-[17px] font-medium text-foreground group-hover:text-white transition-colors">
              {market.symbol}
            </div>
            <div className="text-[12px] text-muted-dark">{market.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-muted-light">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: isMaturing ? "#F0A85C" : "#A9C8EE" }}
          />
          <span className="capitalize">{market.status.replace("_", " ")}</span>
        </div>
      </div>

      <div className="py-3 text-[13px] text-muted flex items-center justify-between">
        <span className="text-muted-dark">Source</span>
        <span>{market.yieldSource}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/10 text-center">
        <div className="flex flex-col gap-1 items-start">
          <span className="text-[11px] mono uppercase tracking-wider text-muted-dark">
            Implied Yield
          </span>
          <span className="mono text-[18px] text-ice font-medium">
            {formatApy(market.impliedApy)}
          </span>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-[11px] mono uppercase tracking-wider text-muted-dark">
            Rate Now
          </span>
          <span className="mono text-[18px] text-foreground">
            {formatApy(market.underlyingApy)}
          </span>
        </div>
      </div>

      <div className="pt-3 flex items-center justify-between text-[13px]">
        <div className="flex flex-col">
          <span className="text-[11px] mono text-muted-dark">MATURITY</span>
          <span className="text-foreground">{market.maturity}</span>
          <span className="mono text-[11px] text-muted-dark">
            {market.daysRemaining} DAYS
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[11px] mono text-muted-dark">LIQUIDITY</span>
          <span className="mono text-foreground font-medium">
            {formatUsd(market.liquidityUsd)}
          </span>
        </div>
      </div>
    </Link>
  );
}
