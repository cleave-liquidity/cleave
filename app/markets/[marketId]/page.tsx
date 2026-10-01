"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useMarket } from "@/hooks/useMarket";
import { YieldChart } from "@/components/trade/YieldChart";
import { TradePanel } from "@/components/trade/TradePanel";
import { formatApy, formatUsd } from "@/lib/utils/formatters";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params?.marketId as string;
  const { market, isLoading } = useMarket(marketId);

  if (isLoading) {
    return (
      <div className="bg-background text-foreground min-h-screen flex flex-col">
        <Navbar isLanding={false} />
        <div className="flex-grow flex items-center justify-center font-mono text-muted">
          Loading market details...
        </div>
        <Footer />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="bg-background text-foreground min-h-screen flex flex-col">
        <Navbar isLanding={false} />
        <div className="flex-grow flex flex-col items-center justify-center gap-4 text-center px-4">
          <h1 className="text-[28px] font-normal text-foreground">
            Market Not Found
          </h1>
          <p className="text-muted text-[15px]">
            The requested yield market does not exist or has been archived.
          </p>
          <Link
            href="/markets"
            className="px-6 py-2.5 bg-foreground text-background font-medium rounded-lg text-[14px]"
          >
            Back to Markets
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <Navbar isLanding={false} />

      <main className="flex-grow max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        {/* Back Link */}
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-[14px] text-muted hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Markets</span>
        </Link>

        {/* Main Grid: Left Market Details, Right Trade Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-start">
          {/* LEFT: Market Identity, Metrics, Chart, Details */}
          <div className="flex flex-col gap-8">
            {/* Market Header */}
            <div className="flex flex-col gap-4 pb-6 border-b border-white/12">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3.5">
                  <div className="mono w-12 h-12 border border-white/20 rounded-full flex items-center justify-center text-[12px] text-muted">
                    {market.symbol}
                  </div>
                  <div>
                    <h1 className="text-[28px] sm:text-[34px] font-normal tracking-[-0.02em] m-0 text-foreground">
                      {market.name}
                    </h1>
                    <span className="text-[14px] text-muted">
                      {market.yieldSource}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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

            {/* Core Metrics Banner */}
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

            {/* Yield Chart */}
            <YieldChart
              underlyingApy={market.underlyingApy}
              impliedApy={market.impliedApy}
            />

            {/* Protocol & Contract Information */}
            <div className="border border-white/14 rounded-[10px] bg-surface p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <ShieldCheck className="w-5 h-5 text-ice" />
                <h3 className="m-0 text-[16px] font-medium text-foreground">
                  Market & Contract Architecture
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-dark">Underlying Asset</span>
                  <span className="font-mono text-foreground">
                    {market.underlyingAsset}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-dark">Source Yield Vault</span>
                  <span className="font-mono text-foreground truncate">
                    {market.vaultAddress || "0xVaultAddress..."}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-dark">Principal Token (PT)</span>
                  <span className="font-mono text-ice truncate">
                    {market.ptAddress || "0xPTContract..."}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-dark">Yield Token (YT)</span>
                  <span className="font-mono text-amber truncate">
                    {market.ytAddress || "0xYTContract..."}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[12px] text-muted-dark border-t border-white/10 flex items-center justify-between">
                <span>Network: Robinhood Chain Mainnet (Chain ID 4663)</span>
                <a
                  href={`https://explorer.robinhoodchain.org`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted hover:text-white transition-colors"
                >
                  <span>Block Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT: Sticky Trade Panel */}
          <div className="w-full">
            <TradePanel market={market} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
