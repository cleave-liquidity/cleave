"use client";

import React from "react";
import Link from "next/link";
import { YieldMarket } from "@/types/market";
import { formatApy, formatUsd } from "@/lib/utils/formatters";
import { AssetIcon } from "./AssetIcon";

export function MarketCard({
  market,
  href,
  tradeHrefs,
}: {
  market: YieldMarket;
  href?: string;
  /** When given the card is a static summary with Fixed Yield / Trading Yield trade actions (the Trade hub). */
  tradeHrefs?: { fixed: string; long: string };
}) {
  const isMaturing = market.status === "maturing";
  const symbol = market.assetMetadata?.symbol || market.symbol;

  const body = (
    <>
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <AssetIcon
            symbol={market.assetMetadata?.symbol || market.symbol}
            name={market.assetMetadata?.name || market.name}
            iconUrl={market.assetMetadata?.iconUrl}
            size="sm"
          />
          <div>
            <div className="text-[17px] font-medium text-foreground group-hover:text-white transition-colors">
              {market.assetMetadata?.symbol || market.symbol}
            </div>
            <div className="text-[12px] text-muted-dark">{market.assetMetadata?.name || market.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-muted-light">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: isMaturing ? "#EF5F22" : "#3B86FF" }}
          />
          <span className="capitalize">{market.status.replace("_", " ")}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/10 text-center">
        <div className="flex flex-col gap-1 items-start">
          <span className="text-[11px] mono uppercase tracking-wider text-muted-dark">
            Implied APY
          </span>
          <span className="mono tabular-nums text-[18px] font-medium text-ice">
            {formatApy(market.impliedApy)}
          </span>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-[11px] mono uppercase tracking-wider text-muted-dark">
            Rate Now
          </span>
          <span className="mono tabular-nums text-[18px] text-foreground">
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
          <span className="mono tabular-nums font-medium text-foreground">
            {formatUsd(market.liquidityUsd)}
          </span>
        </div>
      </div>
    </>
  );

  if (tradeHrefs) {
    return (
      <article className="border border-white/15 bg-surface p-4 sm:p-5">
        {body}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Link
            href={tradeHrefs.fixed}
            aria-label={`Open Fixed Yield on ${symbol}`}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-ice/30 bg-ice/10 text-[13px] font-medium text-ice transition-colors hover:border-ice/60 hover:bg-ice/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
          >
            Fixed Yield →
          </Link>
          <Link
            href={tradeHrefs.long}
            aria-label={`Open Trading Yield on ${symbol}`}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-amber/30 bg-amber/10 text-[13px] font-medium text-amber transition-colors hover:border-amber/60 hover:bg-amber/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
          >
            Trading Yield →
          </Link>
        </div>
      </article>
    );
  }

  return (
    <Link
      href={href ?? `/markets/${market.id}`}
      className="group block border border-white/14 bg-surface p-4 transition-colors hover:border-ice/40 hover:bg-surface-raised sm:p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
    >
      {body}
    </Link>
  );
}
