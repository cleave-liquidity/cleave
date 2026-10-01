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
import { useNetworkGuard } from "@/hooks/useNetworkGuard";
import { getNetworkLabel } from "@/lib/web3/environment";

export default function MarketsPage() {
  const { markets, isLoading, error } = useMarkets();
  const { chainId, isConnected } = useNetworkGuard();
  const networkLabel = getNetworkLabel(chainId, isConnected);

  const totalLiquidity = markets.reduce(
    (sum, m) => sum + m.liquidityUsd,
    0
  );

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
              Explore yield-bearing assets on Robinhood Chain. Choose Fixed Yield
              for predictable outcomes or Long Yield for floating rate exposure.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-white/10 md:grid-cols-4">
            <div className="flex min-w-0 flex-col">
              <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                Total Liquidity
              </span>
              <span className="mono text-[22px] sm:text-[24px] font-medium text-foreground">
                {isLoading ? "..." : formatUsd(totalLiquidity)}
              </span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                Available Markets
              </span>
              <span className="mono text-[22px] sm:text-[24px] font-medium text-ice">
                {isLoading ? "..." : markets.length}
              </span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                Network
              </span>
              <span className="truncate text-[13px] font-medium text-foreground" title={networkLabel}>
                {networkLabel.replace("Default · ", "")}
              </span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                Data
              </span>
              <DataModeBadge mode={yieldAdapter.mode} />
            </div>
          </div>
        </div>

        {/* Market Table */}
        <div className="mt-8">
          {isLoading ? (
            <div className="py-24 text-center text-muted font-mono">
              Loading yield markets...
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
