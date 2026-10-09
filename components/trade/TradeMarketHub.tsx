"use client";

import React, { useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { MarketTable } from "@/components/markets/MarketTable";
import { useMarkets } from "@/hooks/useMarkets";
import { formatUsd } from "@/lib/utils/formatters";
import { getYieldErrorMessage } from "@/types/errors";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { isMarketExecutable } from "@/lib/markets/status";
import { buildTradeWorkspaceHref } from "@/lib/markets/trade-strategy";
import { getConfiguredChainId, getNetworkShortLabel } from "@/lib/web3/environment";

/**
 * Trade hub: the same market table as the Markets page, narrowed to what can be traded right now,
 * with the two ways in (Fixed Yield / Trading Yield) as the row action.
 */
export function TradeMarketHub() {
  const { markets, isLoading, error } = useMarkets();
  const networkShortLabel = getNetworkShortLabel(getConfiguredChainId(), false);
  const live = yieldAdapter.mode === "live";

  const tradeableMarkets = useMemo(() => markets.filter((market) => isMarketExecutable(market)), [markets]);
  const totalLiquidity = tradeableMarkets.some(
    (market) => market.metricAvailability?.liquidityUsd === "unavailable" || market.metricAvailability?.liquidityUsd === "not-applicable",
  )
    ? null
    : tradeableMarkets.reduce((sum, market) => sum + market.liquidityUsd, 0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />

        <main id="main-content" className="flex-grow max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
            <div className="flex flex-col gap-2">
              <div className="mono text-[12px] tracking-[0.18em] text-muted-dark uppercase">
                Trade Yield · Robinhood Chain
              </div>
              <h1 className="text-[36px] sm:text-[44px] font-normal tracking-[-0.03em] m-0 text-foreground">
                Trade Yield
              </h1>
              <p className="text-[16px] text-muted max-w-[560px] m-0 font-light">
                Choose a live market. Then lock a quoted yield with Fixed Yield, or trade future yield with Trading
                Yield.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Open Liquidity">
                <span className="mono text-[20px] sm:text-[22px] font-medium text-foreground">
                  {isLoading ? "..." : formatUsd(totalLiquidity)}
                </span>
              </StatTile>
              <StatTile label="Tradeable Markets">
                <span className="mono text-[20px] sm:text-[22px] font-medium text-ice">
                  {isLoading ? "..." : tradeableMarkets.length}
                </span>
              </StatTile>
              <StatTile label="Network">
                <span className="text-[13px] font-medium text-foreground">Robinhood Chain</span>
                <span className="mono text-[10px] text-muted-dark">{networkShortLabel}</span>
              </StatTile>
              <StatTile label="Data Mode">
                <span className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      live ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-[13px] font-medium text-foreground">{live ? "Live Data" : "Preview Data"}</span>
                </span>
                <span className="mono text-[10px] text-muted-dark">{live ? "YELTRA Directory" : "Mock Adapter"}</span>
              </StatTile>
            </div>
          </div>

          <div className="mt-8">
            {isLoading ? (
              <div className="py-24 text-center text-muted font-mono" role="status">
                Loading live markets…
              </div>
            ) : error ? (
              <div className="py-24 text-center text-negative" role="alert">
                {getYieldErrorMessage(error)}
              </div>
            ) : tradeableMarkets.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-surface/60 px-6 py-20 text-center" role="status">
                <div className="mono text-[11px] uppercase tracking-[0.14em] text-muted-dark">No markets open right now</div>
                <p className="mx-auto mt-3 max-w-[420px] text-[14px] leading-6 text-muted">
                  No market currently has a verified YELTRA execution route. Some markets may be read-only, paused, or past maturity; check their details for the current reason.
                </p>
              </div>
            ) : (
              <MarketTable
                markets={tradeableMarkets}
                defaultSort={{ field: "liquidityUsd", asc: false }}
                tradeHrefs={(market) => ({
                  fixed: buildTradeWorkspaceHref(market.id, "fixed"),
                  long: buildTradeWorkspaceHref(market.id, "long"),
                })}
              />
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

function StatTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm flex flex-col gap-1 min-w-0">
      <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">{label}</span>
      {children}
    </div>
  );
}
