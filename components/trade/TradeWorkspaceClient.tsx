"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { AssetIcon } from "@/components/markets/AssetIcon";
import { TradePanel } from "@/components/trade/TradePanel";
import { formatApy, formatUsd } from "@/lib/utils/formatters";
import { YieldMarket } from "@/types/market";
import { ArrowLeft } from "lucide-react";

export function TradeWorkspaceClient({
  market,
  initialStrategy,
  initialAmount,
}: {
  market: YieldMarket;
  initialStrategy?: "fixed" | "long";
  initialAmount?: string;
}) {
  const assetSymbol = market.assetMetadata?.symbol || market.symbol;
  const assetName = market.assetMetadata?.name || market.name;
  const sourceName = market.sourceProtocol || market.protocolMetadata?.name || market.yieldSource;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />

        <main id="main-content" className="flex-grow max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
          <Link
            href="/trade"
            className="inline-flex items-center gap-2 text-[14px] text-muted hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Choose Another Market</span>
          </Link>

          <div className="flex flex-col gap-6 pb-8 border-b border-white/12">
            <div className="flex items-start justify-between gap-5 flex-wrap">
              <div className="flex items-center gap-3.5">
                <AssetIcon
                  symbol={assetSymbol}
                  name={assetName}
                  iconUrl={market.assetMetadata?.iconUrl}
                  size="lg"
                />
                <div>
                  <div className="mono text-[11px] tracking-[0.16em] text-muted-dark uppercase">
                    Trade Yield Workspace
                  </div>
                  <h1 className="mt-1 text-[32px] sm:text-[40px] font-normal tracking-[-0.03em] text-foreground">
                    {assetSymbol}
                  </h1>
                  <p className="text-[14px] text-muted">
                    {assetName} · {sourceName}
                  </p>
                </div>
              </div>
              <Link
                href={`/markets/${market.id}`}
                className="text-[13px] text-ice hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice"
              >
                View Market Details →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MarketMetric label="Fixed Yield" value={formatApy(market.impliedApy)} tone="ice" />
              <MarketMetric label="Rate Now" value={formatApy(market.underlyingApy)} />
              <MarketMetric label="Maturity" value={market.maturity} />
              <MarketMetric label="Liquidity" value={formatUsd(market.liquidityUsd)} />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-start">
            <div className="flex flex-col gap-4 max-w-[620px]">
              <div className="mono text-[11px] tracking-[0.14em] text-muted-dark uppercase">
                Select your yield exposure
              </div>
              <p className="text-[16px] leading-7 text-muted">
                Choose Fixed Yield for a defined outcome at maturity or Long Yield for floating rate exposure. The live quote and wallet checks are handled in the trade panel.
              </p>
            </div>
            <div className="w-full lg:sticky lg:top-28">
              <TradePanel
                market={market}
                initialStrategy={initialStrategy}
                initialAmount={initialAmount}
              />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

function MarketMetric({
  label,
  value,
  tone = "foreground",
}: {
  label: string;
  value: string;
  tone?: "foreground" | "ice";
}) {
  return (
    <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm flex flex-col gap-1">
      <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">{label}</span>
      <span className={`mono text-[16px] sm:text-[18px] font-medium ${tone === "ice" ? "text-ice" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
