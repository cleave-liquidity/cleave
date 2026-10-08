"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { DataModeBadge } from "@/components/layout/DataModeBadge";
import { YieldChart } from "@/components/trade/YieldChart";
import { AssetIcon } from "@/components/markets/AssetIcon";
import { MarketMetricsStrip } from "@/components/markets/MarketMetricsStrip";
import { formatApy } from "@/lib/utils/formatters";
import { getMarketStatus, isMarketExecutable } from "@/lib/markets/status";
import { buildTradeWorkspaceHref } from "@/lib/markets/trade-strategy";
import { YieldMarket } from "@/types/market";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { DividendEarnPanel } from "@/components/dividend/DividendEarnPanel";

export function MarketDetailClient({
  market,
}: {
  market: YieldMarket;
}) {
  const isTradeable = isMarketExecutable(market);
  const marketStatus = getMarketStatus(market);
  const hasYieldMetrics =
    (market.metricAvailability?.underlyingApy ?? "verified") === "verified" &&
    (market.metricAvailability?.impliedApy ?? "verified") === "verified";
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
            <div className="flex flex-col gap-4 pb-6 border-b border-white/10">
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
                      Built on Robinhood Chain
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <DataModeBadge mode={market.dataMode} />
                  <span className="mono text-[12px] text-muted-light border border-white/15 rounded-full px-3 py-1 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: marketStatus === "maturing" ? "#EF5F22" : "#3B86FF" }}
                      aria-hidden="true"
                    />
                    <span className="capitalize">{marketStatus}</span>
                  </span>
                </div>
              </div>

              <p className="text-[15px] leading-[1.6] text-muted font-light m-0">
                {market.description}
              </p>
            </div>

            <MarketMetricsStrip market={market} />

            {hasYieldMetrics ? (
              <YieldChart
                underlyingApy={market.underlyingApy}
                impliedApy={market.impliedApy}
                dataMode={market.dataMode}
                historicalData={market.historicalData}
              />
            ) : (
              <div className="border border-white/15 bg-surface/70 px-5 py-4 text-[13px] leading-6 text-muted-dark">
                Current rate history and implied pricing are not deterministically available for this market infrastructure.
              </div>
            )}

            <DividendEarnPanel market={market} />

            <details className="group/advanced border border-white/15 bg-surface/70 p-5 sm:p-6">
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
                <InfoRow label="Network" value={`${market.network === "mainnet" ? "Robinhood Chain Mainnet" : "Robinhood Chain Testnet"} · Chain ID ${market.chainId}`} />
                <InfoRow label="Market infrastructure" value={market.sourceProtocol || "Unavailable"} />
                <InfoRow label="Market address" value={market.marketAddress || "Unavailable"} />
                <InfoRow label="Underlying address" value={market.underlyingTokenAddress || "Unavailable"} />
                <InfoRow label="YELTRA registration" value={market.registration?.status === "registered" ? "Registered in YELTRA directory" : "Directory status unavailable"} />
                <InfoRow label="Maturity" value={market.maturity} />
                <InfoRow label="PT Contract" value={market.ptAddress || "Unavailable"} tone={market.ptAddress ? "ice" : "muted"} />
                <InfoRow label="YT Contract" value={market.ytAddress || "Unavailable"} tone={market.ytAddress ? "amber" : "muted"} />
              </dl>
              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {market.dataMode === "live" ? (
                  <span className="max-w-[520px] text-[12px] leading-5 text-muted-dark">
                    {market.sourceProtocol
                      ? `Underlying yield market and liquidity infrastructure sourced from ${market.sourceProtocol} on Robinhood Chain.`
                      : "Underlying yield market infrastructure is provided by an approved external source on Robinhood Chain."}
                  </span>
                ) : (
                  <span className="mono text-[10px] uppercase tracking-[0.12em] text-muted-dark">
                    No production contracts configured
                  </span>
                )}
                <Link href="/contracts" className="text-[13px] text-ice hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice">
                  View Contract Registry →
                </Link>
              </div>
            </details>
          </div>

          <div className="w-full lg:sticky lg:top-32">
            <div className="border border-white/15 bg-surface/70 p-5 sm:p-6">
              <div className="mono text-[11px] uppercase tracking-[0.14em] text-muted-dark">
                {market.execution?.enabled === false ? "Market access" : "Trade this market"}
              </div>
              <h2 className="mt-2 text-[21px] font-normal text-foreground">
                {market.execution?.enabled === false ? "Read-only market" : "Choose how to trade this yield"}
              </h2>
              {market.execution?.enabled === false ? (
                <div className="mt-5 border border-white/15 bg-surface px-4 py-4 text-[13px] leading-6 text-muted-dark">
                  Execution unavailable for this provider. Market data and registration metadata remain read-only.
                </div>
              ) : (
                <div className="mt-5 flex flex-col divide-y divide-white/10 border-y border-white/10">
                  <StrategyRow
                    title="Fixed Yield"
                    caption="Lock a quoted yield · implied APY shown"
                    figure={formatApy(market.impliedApy)}
                    tone="ice"
                    href={isTradeable ? buildTradeWorkspaceHref(market.id, "fixed") : undefined}
                  />
                  <StrategyRow
                    title="Trading Yield"
                    caption="Trade future yield · rate now shown"
                    figure={formatApy(market.underlyingApy)}
                    tone="amber"
                    href={isTradeable ? buildTradeWorkspaceHref(market.id, "long") : undefined}
                  />
                </div>
              )}
              {!isTradeable && (
                <div className="mt-5 border border-white/15 bg-surface px-4 py-3 text-center text-[13px] text-muted-dark">
                  {market.execution?.enabled === false
                    ? "Discovery only. YELTRA execution is not configured for this provider."
                    : marketStatus === "paused"
                      ? "Trading is currently paused."
                      : "This market has passed maturity."}
                </div>
              )}
            </div>
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

function StrategyRow({
  title,
  caption,
  figure,
  tone,
  href,
}: {
  title: string;
  caption: string;
  figure: string;
  tone: "ice" | "amber";
  href?: string;
}) {
  const toneClass = tone === "ice" ? "text-ice" : "text-amber";
  const body = (
    <>
      <span>
        <span className={`block text-[14px] font-medium ${toneClass}`}>{title}</span>
        <span className="mt-1 block text-[12px] text-muted-dark">{caption}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className={`mono text-[16px] ${toneClass}`}>{figure}</span>
        {href && <ArrowUpRight className="h-4 w-4 text-muted-dark transition-colors group-hover:text-white" aria-hidden="true" />}
      </span>
    </>
  );

  if (!href) {
    return <div className="flex items-center justify-between gap-4 py-4">{body}</div>;
  }

  return (
    <Link
      href={href}
      aria-label={`Trade ${title}`}
      className="group -mx-2 flex min-h-[64px] items-center justify-between gap-4 px-2 py-4 transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ice"
    >
      {body}
    </Link>
  );
}
