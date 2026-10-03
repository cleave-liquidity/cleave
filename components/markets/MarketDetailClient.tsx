"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { DataModeBadge } from "@/components/layout/DataModeBadge";
import { YieldChart } from "@/components/trade/YieldChart";
import { TradePanel } from "@/components/trade/TradePanel";
import { AssetIcon } from "@/components/markets/AssetIcon";
import { formatApy, formatUsd } from "@/lib/utils/formatters";
import { ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";
import { YieldMarket } from "@/types/market";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export function MarketDetailClient({
  market,
  initialStrategy,
  initialAmount,
}: {
  market: YieldMarket;
  /** Preselected strategy, e.g. when arriving from a landing-page CTA. */
  initialStrategy?: "fixed" | "long";
  initialAmount?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />

      <main id="main-content" className="flex-grow max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-[14px] text-muted hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Markets</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-start">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 pb-6 border-b border-white/12">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3.5">
                  <AssetIcon
                    symbol={market.assetMetadata?.symbol || market.symbol}
                    name={market.assetMetadata?.name || market.name}
                    iconUrl={market.assetMetadata?.iconUrl}
                    size="lg"
                  />
                  <div>
                    <div className="mono mb-1 text-[11px] uppercase tracking-[0.16em] text-muted-dark">
                      {market.assetMetadata?.symbol || market.symbol} / Yield Market
                    </div>
                    <h1 className="text-[28px] sm:text-[34px] font-normal tracking-[-0.02em] m-0 text-foreground">
                      {market.assetMetadata?.name || market.name}
                    </h1>
                    <span className="text-[14px] text-muted">
                      {market.protocolMetadata?.name || market.sourceProtocol || "Source protocol"} · Built on Robinhood Chain
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DataModeBadge mode={market.dataMode} />
                  <span className="mono text-[12px] text-muted-dark border border-white/16 rounded-full px-3 py-1">
                    {market.sourceProtocol || "Protocol"}
                  </span>
                  <span className="mono text-[12px] text-muted-light border border-white/16 rounded-full px-3 py-1 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          market.status === "maturing" ? "#F0A85C" : "#A9C8EE",
                      }}
                    />
                    <span className="capitalize">{market.status}</span>
                  </span>
                </div>
              </div>

              <p className="text-[15px] leading-[1.6] text-muted font-light m-0">
                {market.description}
              </p>
            </div>

            <div className="grid grid-cols-2 border-y border-white/14 bg-surface/60 sm:grid-cols-4">
              <div className="flex flex-col gap-1 px-4 py-4 sm:px-5 sm:py-5">
                <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                  Implied APY
                </span>
                <span className="mono text-[22px] sm:text-[24px] text-ice font-medium">
                  {formatApy(market.impliedApy)}
                </span>
                <span className="text-[11px] text-muted-dark">Market pricing</span>
              </div>
              <div className="flex flex-col gap-1 border-l border-white/10 px-4 py-4 first:border-l-0 sm:px-5 sm:py-5">
                <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                  Rate Now
                </span>
                <span className="mono text-[22px] sm:text-[24px] text-foreground font-medium">
                  {formatApy(market.underlyingApy)}
                </span>
                <span className="text-[11px] text-muted-dark">Underlying APY</span>
              </div>
              <div className="flex flex-col gap-1 px-4 py-4 sm:px-5 sm:py-5">
                <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                  Maturity
                </span>
                <span className="mono text-[16px] sm:text-[18px] text-foreground font-medium">
                  {market.maturity}
                </span>
                <span className="mono text-[11px] text-muted-dark">
                  {market.daysRemaining} DAYS LEFT
                </span>
              </div>
              <div className="flex flex-col gap-1 border-l border-white/10 px-4 py-4 sm:px-5 sm:py-5">
                <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                  Liquidity
                </span>
                <span className="mono text-[16px] sm:text-[18px] text-foreground font-medium">
                  {formatUsd(market.liquidityUsd)}
                </span>
                <span className="text-[11px] text-muted-dark">Robinhood Chain</span>
              </div>
            </div>

            <YieldChart
              underlyingApy={market.underlyingApy}
              impliedApy={market.impliedApy}
              dataMode={market.dataMode}
              historicalData={market.historicalData}
            />

            <details className="group/advanced border border-white/14 bg-surface/70 p-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 pb-3 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-ice" aria-hidden="true" />
                  <span>
                    <span className="block text-[16px] font-medium">Advanced market architecture</span>
                    <span className="mono mt-1 block text-[10px] uppercase tracking-[0.14em] text-muted-dark">
                      {market.dataMode === "live" ? "Verified external protocol metadata" : "Preview metadata · no production contracts"}
                    </span>
                  </span>
                </span>
                <span className="mono text-[11px] text-muted-dark group-open/advanced:rotate-180 transition-transform" aria-hidden="true">⌄</span>
              </summary>
              <dl className="divide-y divide-white/10 border-y border-white/10 text-[13px]">
                <InfoRow label="Underlying Asset" value={market.underlyingAsset} />
                <InfoRow label="Yield Source" value={market.yieldSource} />
                <InfoRow label="Source Protocol" value={market.protocolMetadata?.name || market.sourceProtocol || "Not specified"} tone="ice" />
                <InfoRow label="Network" value={`${market.network === "mainnet" ? "Robinhood Chain Mainnet" : "Robinhood Chain Testnet"} · Chain ID ${market.network === "mainnet" ? ROBINHOOD_CHAIN_ID : 46630}`} />
                <InfoRow label="Maturity" value={market.maturity} />
                <InfoRow label="PT Contract" value={market.ptAddress || "Unavailable"} tone={market.ptAddress ? "ice" : "muted"} />
                <InfoRow label="YT Contract" value={market.ytAddress || "Unavailable"} tone={market.ytAddress ? "amber" : "muted"} />
                <InfoRow label="Adapter" value={market.dataMode === "live" ? "PendleLiveYieldMarketAdapter" : "MockYieldMarketAdapter"} tone={market.dataMode === "live" ? "ice" : "amber"} />
              </dl>
              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="mono text-[10px] uppercase tracking-[0.12em] text-amber">
                  {market.dataMode === "live" ? "External Pendle contracts · not CLEAVE-owned" : "No production contracts configured"}
                </span>
                <Link href="/contracts" className="text-[13px] text-ice hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice">
                  View Contract Registry →
                </Link>
              </div>
            </details>
          </div>

          <div className="w-full lg:sticky lg:top-28">
            <Link
              href={`/trade/${market.id}`}
              className="mb-3 flex min-h-[44px] items-center justify-center border border-ice/50 bg-ice/10 px-4 text-[14px] text-ice transition-colors hover:bg-ice/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
            >
              Open Trade Workspace →
            </Link>
            <TradePanel market={market} initialStrategy={initialStrategy} initialAmount={initialAmount} />
          </div>
        </div>
      </main>

        <Footer />
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ice" | "amber" | "muted";
}) {
  const toneClass = tone === "ice"
    ? "text-ice"
    : tone === "amber"
      ? "text-amber"
      : tone === "muted"
        ? "text-muted-dark"
        : "text-foreground";

  return (
    <div className="grid gap-1 px-3 py-3 sm:grid-cols-[180px_1fr] sm:gap-6">
      <dt className="text-muted-dark">{label}</dt>
      <dd className={`m-0 font-mono ${toneClass}`}>{value}</dd>
    </div>
  );
}
