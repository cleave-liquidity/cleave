"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { AssetIcon } from "@/components/markets/AssetIcon";
import { TradePanel } from "@/components/trade/TradePanel";
import { formatApy, formatUsd } from "@/lib/utils/formatters";
import { YieldMarket } from "@/types/market";
import { ArrowLeft } from "lucide-react";
import {
  buildTradeWorkspaceHref,
  type TradeStrategy,
} from "@/lib/markets/trade-strategy";

export function TradeWorkspaceClient({
  market,
  strategy,
  initialAmount,
}: {
  market: YieldMarket;
  strategy?: TradeStrategy;
  initialAmount?: string;
}) {
  const router = useRouter();
  const assetSymbol = market.assetMetadata?.symbol || market.symbol;
  const assetName = market.assetMetadata?.name || market.name;
  const sourceName = market.sourceProtocol || market.protocolMetadata?.name || market.yieldSource;
  const isTradeable =
    (market.status === "active" || market.status === "maturing") &&
    market.daysRemaining > 0;

  const handleStrategyChange = (nextStrategy: TradeStrategy) => {
    router.replace(buildTradeWorkspaceHref(market.id, nextStrategy), { scroll: false });
  };

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
              <div
                role="group"
                aria-label="Yield strategy"
                className="grid grid-cols-2 border border-white/18 rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  aria-pressed={strategy === "fixed"}
                  onClick={() => handleStrategyChange("fixed")}
                  className={`min-h-[52px] border-0 text-[14px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ice ${
                    strategy === "fixed"
                      ? "border-b-2 border-ice bg-ice/10 text-ice"
                      : "bg-transparent text-muted hover:text-white"
                  }`}
                >
                  Fixed Yield
                </button>
                <button
                  type="button"
                  aria-pressed={strategy === "long"}
                  onClick={() => handleStrategyChange("long")}
                  className={`min-h-[52px] border-0 text-[14px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber ${
                    strategy === "long"
                      ? "border-b-2 border-amber bg-amber/10 text-amber"
                      : "bg-transparent text-muted hover:text-white"
                  }`}
                >
                  Long Yield
                </button>
              </div>
              <p className="text-[16px] leading-7 text-muted">
                {strategy === "fixed"
                  ? "Fixed Yield targets a predictable outcome at maturity. The live quote and wallet checks are handled below."
                  : strategy === "long"
                    ? "Long Yield gives exposure to future yield through maturity. The live quote and wallet checks are handled below."
                    : "Choose Fixed Yield or Long Yield before entering an amount or opening a position."}
              </p>
            </div>
            <div className="w-full lg:sticky lg:top-28">
              {strategy && isTradeable ? (
                <TradePanel
                  key={strategy}
                  market={market}
                  strategy={strategy}
                  initialAmount={initialAmount}
                />
              ) : strategy ? (
                <div className="border border-white/16 rounded-[10px] bg-surface p-5 sm:p-7 text-center">
                  <div className="mono text-[11px] uppercase tracking-[0.14em] text-muted-dark">
                    Execution unavailable
                  </div>
                  <p className="mt-3 text-[14px] leading-6 text-muted">
                    {market.status === "paused"
                      ? "This market is currently paused and cannot be traded."
                      : "This market has passed maturity and cannot be traded."}
                  </p>
                </div>
              ) : (
                <div className="border border-white/16 rounded-[10px] bg-surface p-5 sm:p-7 text-center">
                  <div className="mono text-[11px] uppercase tracking-[0.14em] text-muted-dark">
                    Strategy required
                  </div>
                  <p className="mt-3 text-[14px] leading-6 text-muted">
                    Select Fixed Yield or Long Yield to load the matching quote and execution flow.
                  </p>
                </div>
              )}
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
