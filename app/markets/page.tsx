"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MarketTable } from "@/components/markets/MarketTable";
import { useMarkets } from "@/hooks/useMarkets";
import { formatUsd } from "@/lib/utils/formatters";

export default function MarketsPage() {
  const { markets, isLoading } = useMarkets();

  const totalLiquidity = markets.reduce(
    (sum, m) => sum + m.liquidityUsd,
    0
  );

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <Navbar isLanding={false} />

      <main className="flex-grow max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
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

          <div className="flex items-center gap-6 sm:gap-8 border-t sm:border-t-0 pt-4 sm:pt-0 border-white/10">
            <div className="flex flex-col">
              <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                Total Liquidity
              </span>
              <span className="mono text-[22px] sm:text-[24px] font-medium text-foreground">
                {isLoading ? "..." : formatUsd(totalLiquidity)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
                Live Markets
              </span>
              <span className="mono text-[22px] sm:text-[24px] font-medium text-ice">
                {isLoading ? "..." : markets.length}
              </span>
            </div>
          </div>
        </div>

        {/* Market Table */}
        <div className="mt-8">
          {isLoading ? (
            <div className="py-24 text-center text-muted font-mono">
              Loading yield markets...
            </div>
          ) : (
            <MarketTable markets={markets} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
