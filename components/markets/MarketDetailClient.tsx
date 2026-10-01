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

export function MarketDetailClient({ market }: { market: YieldMarket }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-[10px] bg-surface border border-white/12">
              <div className="flex flex-col gap-1">
                <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                  Implied APY
                </span>
                <span className="mono text-[22px] sm:text-[24px] text-ice font-medium">
                  {formatApy(market.impliedApy)}
                </span>
                <span className="text-[11px] text-muted-dark">Market pricing</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                  Rate Now
                </span>
                <span className="mono text-[22px] sm:text-[24px] text-foreground font-medium">
                  {formatApy(market.underlyingApy)}
                </span>
                <span className="text-[11px] text-muted-dark">Underlying APY</span>
              </div>
              <div className="flex flex-col gap-1">
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
              <div className="flex flex-col gap-1">
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
            />

            <details open className="group/advanced border border-white/14 rounded-[10px] bg-surface p-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 pb-3 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-ice" aria-hidden="true" />
                  <span>
                    <span className="block text-[16px] font-medium">Advanced market architecture</span>
                    <span className="mono mt-1 block text-[10px] uppercase tracking-[0.14em] text-muted-dark">Preview metadata · no production contracts</span>
                  </span>
                </span>
                <span className="mono text-[11px] text-muted-dark group-open/advanced:rotate-180 transition-transform" aria-hidden="true">⌄</span>
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-dark">Underlying Asset</span>
                  <span className="font-mono text-foreground">{market.underlyingAsset}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-dark">Yield Source</span>
                  <span className="font-mono text-foreground truncate">
                    {market.yieldSource}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-dark">Source Protocol</span>
                  <span className="font-mono text-ice truncate">
                    {market.protocolMetadata?.name || market.sourceProtocol || "Not specified"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-dark">Adapter</span>
                  <span className="font-mono text-amber truncate">
                    MockYieldMarketAdapter
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-dark">PT Address</span>
                  <span className="font-mono text-muted-dark truncate">Not deployed · preview only</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-dark">YT Address</span>
                  <span className="font-mono text-muted-dark truncate">Not deployed · preview only</span>
                </div>
              </div>
              <div className="pt-2 text-[12px] text-muted-dark border-t border-white/10 flex items-center justify-between">
                <span>
                  Network: {market.network === "mainnet" ? "Robinhood Chain Mainnet" : "Robinhood Chain Testnet"} · Chain ID {market.network === "mainnet" ? ROBINHOOD_CHAIN_ID : 46630}
                </span>
                <span className="mono text-[10px] uppercase tracking-[0.12em] text-amber">
                  Not deployed · preview only
                </span>
              </div>
            </details>
          </div>

          <div className="w-full">
            <TradePanel market={market} />
          </div>
        </div>
      </main>

        <Footer />
      </div>
    </div>
  );
}
