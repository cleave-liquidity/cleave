"use client";

import React from "react";
import Link from "next/link";
import { YieldMarket } from "@/types/market";
import { formatApy, formatUsd } from "@/lib/utils/formatters";
import { AssetIcon, ProtocolIcon } from "./AssetIcon";

export function MarketCard({ market }: { market: YieldMarket }) {
  const isMaturing = market.status === "maturing";

  return (
    <Link
      href={`/markets/${market.id}`}
      className="group block border border-white/14 bg-surface p-4 transition-colors hover:border-ice/40 hover:bg-surface-raised sm:p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
    >
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
            style={{ background: isMaturing ? "#F0A85C" : "#A9C8EE" }}
          />
          <span className="capitalize">{market.status.replace("_", " ")}</span>
        </div>
      </div>

      <div className="py-3 text-[13px] text-muted flex items-center justify-between">
        <span className="text-muted-dark">Source</span>
        <span className="flex min-w-0 items-center gap-2">
          <ProtocolIcon
            name={market.yieldSourceMetadata?.name || market.protocolMetadata?.name || market.sourceProtocol || market.yieldSource}
            iconUrl={market.yieldSourceMetadata?.iconUrl || market.protocolMetadata?.iconUrl}
          />
          <span className="flex min-w-0 flex-col text-right">
            <span className="text-foreground">{market.sourceProtocol || market.protocolMetadata?.name || market.yieldSource}</span>
            <span className="text-[11px] capitalize text-muted-dark">{market.yieldSource.replace(new RegExp(`^${market.sourceProtocol || market.protocolMetadata?.name || ""}\\s*`, "i"), "")}</span>
          </span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/10 text-center">
        <div className="flex flex-col gap-1 items-start">
          <span className="text-[11px] mono uppercase tracking-wider text-muted-dark">
            Implied Yield
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
    </Link>
  );
}
