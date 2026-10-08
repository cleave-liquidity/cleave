"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MarketTable } from "@/components/markets/MarketTable";
import { useMarkets } from "@/hooks/useMarkets";
import { formatUsd } from "@/lib/utils/formatters";
import { getYieldErrorMessage } from "@/types/errors";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { DataModeBadge } from "@/components/layout/DataModeBadge";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { getConfiguredChainId, getNetworkShortLabel } from "@/lib/web3/environment";
import { summarizeKnownLiquidity } from "@/lib/markets/presentation";

export default function MarketsPage() {
  const { markets, isLoading, error } = useMarkets();
  const networkShortLabel = getNetworkShortLabel(getConfiguredChainId(), false);

  const liquiditySummary = summarizeKnownLiquidity(markets);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />

      <main id="main-content" className="flex-grow max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
        {/* Header Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/12">
          <div className="flex flex-col gap-2">
            <div className="mono text-[12px] tracking-[0.18em] text-muted-dark uppercase">
              Yield Markets · Robinhood Chain
            </div>
            <h1 className="text-[36px] sm:text-[44px] font-normal tracking-[-0.03em] m-0 text-foreground">
              Market Explorer
            </h1>
            <p className="text-[16px] text-muted max-w-[560px] m-0 font-light">
              Explore live yield markets. Compare rates, maturity, liquidity, and
              market conditions before you trade.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm flex flex-col gap-1">
              <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">
                Known Liquidity
              </span>
              <span className="mono text-[20px] sm:text-[22px] font-medium text-foreground">
                {isLoading ? "..." : formatUsd(liquiditySummary.total)}
              </span>
              <span className="mono text-[10px] text-muted-dark">
                {isLoading
                  ? ""
                  : `${liquiditySummary.knownMarkets} / ${liquiditySummary.totalMarkets} markets reported`}
              </span>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm flex flex-col gap-1">
              <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">
                Available Markets
              </span>
              <span className="mono text-[20px] sm:text-[22px] font-medium text-ice">
                {isLoading ? "..." : markets.length}
              </span>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm flex flex-col gap-1">
              <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">
                Network
              </span>
              <span className="text-[13px] font-medium text-foreground">
                Robinhood Chain
              </span>
              <span className="mono text-[10px] text-muted-dark">{networkShortLabel}</span>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm flex flex-col gap-1 min-w-0">
              <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">
                Data Mode
              </span>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse shrink-0" />
                <span className="text-[13px] font-medium text-foreground">
                  {yieldAdapter.mode === "live" ? "Live Data" : "Preview Data"}
                </span>
              </div>
              <span className="mono text-[10px] text-muted-dark">
                {yieldAdapter.mode === "live" ? "Verified live data" : "Local preview data"}
              </span>
            </div>
          </div>
        </div>

        {/* Market Table */}
        <div className="mt-8">
          {isLoading ? (
            <div className="py-24 text-center text-muted font-mono">
              Loading live markets…
            </div>
          ) : error ? (
            <div className="py-24 text-center text-negative">
              {getYieldErrorMessage(error)}
            </div>
          ) : (
            <MarketTable markets={markets} />
          )}
        </div>
      </main>

        <Footer />
      </div>
    </div>
  );
}
