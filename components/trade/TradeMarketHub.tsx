"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { AssetIcon } from "@/components/markets/AssetIcon";
import { useMarkets } from "@/hooks/useMarkets";
import { formatApy, formatUsd } from "@/lib/utils/formatters";
import { getYieldErrorMessage } from "@/types/errors";
import { YieldMarket } from "@/types/market";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import {
  buildTradeWorkspaceHref,
} from "@/lib/markets/trade-strategy";
import { getConfiguredChainId, getNetworkShortLabel } from "@/lib/web3/environment";

export function TradeMarketHub() {
  const { markets, isLoading, error } = useMarkets();
  const networkShortLabel = getNetworkShortLabel(getConfiguredChainId(), false);
  const tradeableMarkets = markets.filter(
    (market) =>
      (market.status === "active" || market.status === "maturing") &&
      market.daysRemaining > 0,
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />

        <main id="main-content" className="flex-grow max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
          <div className="max-w-[760px]">
            <div className="mono text-[12px] tracking-[0.18em] text-muted-dark uppercase">
              Trade Yield · Robinhood Chain
            </div>
            <h1 className="mt-2 text-[36px] sm:text-[48px] font-normal tracking-[-0.04em] text-foreground">
              Trade Yield
            </h1>
            <p className="mt-4 max-w-[640px] text-[16px] leading-7 text-muted font-light">
              Choose a live market, then select Fixed Yield or Long Yield to open the position workspace.
            </p>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-b border-white/12 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mono text-[11px] tracking-[0.14em] text-muted-dark uppercase">
                Live tradeable opportunities
              </div>
              <h2 className="mt-1 text-[24px] font-normal tracking-[-0.02em] text-foreground">
                Choose a market
              </h2>
            </div>
            <div className="mono text-[11px] text-muted-dark">
              {yieldAdapter.mode === "live" ? "PENDLE LIVE DATA" : "PREVIEW DATA"} · {networkShortLabel}
            </div>
          </div>

          <div className="mt-6">
            {isLoading ? (
              <div className="py-24 text-center text-muted font-mono">
                Loading live trade opportunities...
              </div>
            ) : error ? (
              <div className="py-24 text-center text-negative">
                {getYieldErrorMessage(error)}
              </div>
            ) : tradeableMarkets.length === 0 ? (
              <div className="border border-white/12 bg-surface/60 py-20 text-center text-muted font-mono text-[13px]">
                No currently tradeable live markets are available.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {tradeableMarkets.map((market) => (
                  <TradeOpportunityCard key={market.id} market={market} />
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

function TradeOpportunityCard({ market }: { market: YieldMarket }) {
  const symbol = market.assetMetadata?.symbol || market.symbol;
  const name = market.assetMetadata?.name || market.name;
  const source = market.sourceProtocol || market.protocolMetadata?.name || market.yieldSource;

  return (
    <article className="border border-white/14 bg-surface/70 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <AssetIcon
            symbol={symbol}
            name={name}
            iconUrl={market.assetMetadata?.iconUrl}
            size="md"
          />
          <div className="min-w-0">
            <h3 className="truncate text-[18px] font-medium text-foreground">{symbol}</h3>
            <p className="truncate text-[12px] text-muted-dark">{name} · {source}</p>
          </div>
        </div>
        <span className="mono shrink-0 border border-ice/25 bg-ice/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-ice">
          {market.status === "maturing" ? "Maturing" : "Active"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 border-b border-white/10 py-5 sm:grid-cols-3">
        <Metric label="Maturity" value={market.maturity} detail={`${market.daysRemaining} days`} />
        <Metric label="Liquidity" value={formatUsd(market.liquidityUsd)} />
        <Metric label="Rate now" value={formatApy(market.underlyingApy)} detail="Underlying APY" />
      </div>

      <div className="pt-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StrategyAction
            href={buildTradeWorkspaceHref(market.id, "fixed")}
            title="Fixed Yield"
            value={formatApy(market.impliedApy)}
            detail="Market implied APY"
            action="Trade Fixed"
            tone="ice"
          />
          <StrategyAction
            href={buildTradeWorkspaceHref(market.id, "long")}
            title="Long Yield"
            value={formatApy(market.underlyingApy)}
            detail="Underlying APY"
            action="Trade Long"
            tone="amber"
          />
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0">
      <div className="mono text-[10px] uppercase tracking-wider text-muted-dark">{label}</div>
      <div className="mt-1 truncate text-[14px] font-medium text-foreground">{value}</div>
      {detail && <div className="mono mt-1 text-[10px] text-muted-dark">{detail}</div>}
    </div>
  );
}

function StrategyAction({
  href,
  title,
  value,
  detail,
  action,
  tone,
}: {
  href: string;
  title: string;
  value: string;
  detail: string;
  action: string;
  tone: "ice" | "amber";
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[132px] flex-col justify-between border p-4 transition-colors ${tone === "ice" ? "border-ice/20 bg-ice/5 hover:border-ice/50 hover:bg-ice/10" : "border-amber/20 bg-amber/5 hover:border-amber/50 hover:bg-amber/10"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-[14px] font-medium ${tone === "ice" ? "text-ice" : "text-amber"}`}>{title}</div>
          <div className="mono mt-2 text-[22px] text-foreground">{value}</div>
          <div className="mono mt-1 text-[10px] uppercase tracking-wider text-muted-dark">{detail}</div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-dark transition-colors group-hover:text-foreground" aria-hidden="true" />
      </div>
      <span className="mt-4 text-[13px] text-foreground">{action} →</span>
    </Link>
  );
}
