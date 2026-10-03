"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { AssetIcon } from "@/components/markets/AssetIcon";
import { TradePanel, type TradeQuoteContext } from "@/components/trade/TradePanel";
import { formatApy, formatTokenAmount, formatUsd } from "@/lib/utils/formatters";
import type { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import type { QuoteUiState } from "@/lib/markets/quote-state";
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
  const [quoteContext, setQuoteContext] = useState<TradeQuoteContext>(() =>
    createEmptyQuoteContext(market.id, initialAmount),
  );
  const assetSymbol = market.assetMetadata?.symbol || market.symbol;
  const assetName = market.assetMetadata?.name || market.name;
  const sourceName = market.sourceProtocol || market.protocolMetadata?.name || market.yieldSource;
  const isTradeable =
    (market.status === "active" || market.status === "maturing") &&
    market.daysRemaining > 0;

  useEffect(() => {
    setQuoteContext(createEmptyQuoteContext(market.id, initialAmount));
  }, [initialAmount, market.id, strategy]);

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
              <MarketMetric label="Implied APY" value={formatApy(market.impliedApy)} tone="ice" />
              <MarketMetric label="Underlying APY" value={formatApy(market.underlyingApy)} />
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
              <StrategyContext strategy={strategy} market={market} quoteContext={quoteContext} />
            </div>
            <div className="w-full lg:sticky lg:top-28">
              {strategy && isTradeable ? (
                <TradePanel
                  key={strategy}
                  market={market}
                  strategy={strategy}
                  initialAmount={initialAmount}
                  onQuoteContextChange={setQuoteContext}
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

function createEmptyQuoteContext(marketId: string, initialAmount?: string): TradeQuoteContext {
  const parsed = Number(initialAmount);
  return {
    marketId,
    inputAmount: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    quoteState: "idle",
    fixedQuote: null,
    longQuote: null,
  };
}

function StrategyContext({
  strategy,
  market,
  quoteContext,
}: {
  strategy?: TradeStrategy;
  market: YieldMarket;
  quoteContext: TradeQuoteContext;
}) {
  if (!strategy) {
    return (
      <p className="text-[16px] leading-7 text-muted">
        Choose Fixed Yield or Long Yield to load the matching quote and execution flow.
      </p>
    );
  }

  const fixed = strategy === "fixed";
  const contextMatchesMarket = quoteContext.marketId === market.id;
  const quoteState: QuoteUiState = contextMatchesMarket ? quoteContext.quoteState : "idle";
  const fixedQuote: FixedYieldQuote | null = contextMatchesMarket ? quoteContext.fixedQuote : null;
  const longQuote: LongYieldQuote | null = contextMatchesMarket ? quoteContext.longQuote : null;
  const inputAmount = contextMatchesMarket ? quoteContext.inputAmount : null;
  const assetSymbol = market.assetMetadata?.symbol || market.symbol;
  const assetName = market.assetMetadata?.name || market.name;
  const sourceProtocol = market.sourceProtocol || market.protocolMetadata?.name;
  const sourceLabel = sourceProtocol ? `${market.yieldSource} via ${sourceProtocol}` : market.yieldSource;
  const timeRemaining = market.daysRemaining > 0 ? `${market.daysRemaining} days remaining` : "maturity reached";
  const marketIsTradeable =
    (market.status === "active" || market.status === "maturing") && market.daysRemaining > 0;

  const positionContext = fixed
    ? getFixedPositionContext({
        market,
        marketIsTradeable,
        quoteState,
        quote: fixedQuote,
        inputAmount,
      })
    : getLongPositionContext({
        market,
        marketIsTradeable,
        quoteState,
        quote: longQuote,
        inputAmount,
      });

  const points = fixed
    ? [
        ["How it works", "You receive PT exposure from the current quote."],
        ["At maturity", "Eligible PT may be redeemed for underlying value."],
        ["Before maturity", "The position may be exited at prevailing market pricing."],
        ["Key risk", "Early exit can produce a different realized outcome from the quoted maturity outcome."],
      ]
    : [
        ["How it works", "You receive YT exposure to the future yield stream."],
        ["While active", "Eligible yield may be claimable while the position remains active."],
        ["At maturity", "YT does not redeem principal; its exposure follows maturity behavior."],
        ["Key risk", "The position may lose value if realized yield underperforms market expectations."],
      ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className={`text-[24px] font-normal ${fixed ? "text-ice" : "text-amber"}`}>
          {fixed ? "Fixed Yield" : "Long Yield"}
        </h2>
        <p className="mt-2 text-[16px] leading-7 text-muted">
          {fixed
            ? "A predictable-outcome position held toward maturity."
            : "Exposure to future yield until maturity."}
        </p>
      </div>

      <div className="border-y border-white/10 py-3">
        <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Market lens</div>
        <p className="mt-2 text-[14px] leading-6 text-muted">
          {assetName} ({assetSymbol}) · {sourceLabel}. The market is pricing {formatApy(market.impliedApy)} implied APY
          against {formatApy(market.underlyingApy)} current underlying APY, with {timeRemaining} until {market.maturity}.
        </p>
        <p className="mt-2 text-[13px] leading-6 text-muted-dark">
          {fixed
            ? `PT behavior is maturity-oriented: redemption follows the market's maturity terms, while an early exit uses prevailing ${assetSymbol} pricing.`
            : `YT behavior follows the future yield stream: claims depend on realized yield while active, and the exposure expires at ${market.maturity}.`}
        </p>
      </div>

      <div className="border-b border-white/10 pb-3">
        <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Position lens</div>
        <p className="mt-2 text-[14px] leading-6 text-muted">{positionContext}</p>
      </div>

      <dl className="border-y border-white/10">
        {points.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b border-white/10 py-2.5 last:border-b-0">
            <dt className="text-[13px] text-muted-dark">{label}</dt>
            <dd className="mono text-right text-[12px] text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

    </div>
  );
}

function getFixedPositionContext({
  market,
  marketIsTradeable,
  quoteState,
  quote,
  inputAmount,
}: {
  market: YieldMarket;
  marketIsTradeable: boolean;
  quoteState: QuoteUiState;
  quote: FixedYieldQuote | null;
  inputAmount: number | null;
}): string {
  if (!marketIsTradeable) return "This market is not currently tradeable, so no position quote is shown.";
  if (quoteState === "quoting") return `Fetching a live Fixed quote for ${inputAmount ?? "your"} ${market.quoteAsset}.`;
  if (quoteState === "unavailable") return "No executable Fixed route is available for this amount. No position outputs are shown.";
  if (quoteState === "error") return "The live Fixed quote could not be fetched. Retry before relying on position-specific values.";
  if (quoteState !== "ready" || !quote || inputAmount === null) {
    return `Enter an amount in the trade panel to preview PT received, Fixed APY, maturity value, impact, and fee for ${market.symbol}.`;
  }

  const fee = quote.networkFeeEstimate === undefined
    ? "the network fee is shown before confirmation"
    : `the estimated network fee is ~${formatTokenAmount(quote.networkFeeEstimate, 4)} ETH`;
  return `For ${formatTokenAmount(inputAmount)} ${market.quoteAsset}, the quote returns ${formatTokenAmount(quote.ptReceived)} ${market.symbol} at ${formatApy(quote.quotedFixedApy)} Fixed APY. It estimates ${formatTokenAmount(quote.estimatedMaturityValue)} ${market.symbol} at maturity with ${quote.priceImpact}% price impact; ${fee}.`;
}

function getLongPositionContext({
  market,
  marketIsTradeable,
  quoteState,
  quote,
  inputAmount,
}: {
  market: YieldMarket;
  marketIsTradeable: boolean;
  quoteState: QuoteUiState;
  quote: LongYieldQuote | null;
  inputAmount: number | null;
}): string {
  if (!marketIsTradeable) return "This market is not currently tradeable, so no position quote is shown.";
  if (quoteState === "quoting") return `Fetching a live Long quote for ${inputAmount ?? "your"} ${market.quoteAsset}.`;
  if (quoteState === "unavailable") return "No executable Long route is available for this amount. No position outputs are shown.";
  if (quoteState === "error") return "The live Long quote could not be fetched. Retry before relying on position-specific values.";
  if (quoteState !== "ready" || !quote || inputAmount === null) {
    return `Enter an amount in the trade panel to preview YT received, break-even APY, yield exposure, impact, and fee for ${market.symbol}.`;
  }

  const fee = quote.networkFeeEstimate === undefined
    ? "the network fee is shown before confirmation"
    : `the estimated network fee is ~${formatTokenAmount(quote.networkFeeEstimate, 4)} ETH`;
  return `For ${formatTokenAmount(inputAmount)} ${market.quoteAsset}, the quote returns ${formatTokenAmount(quote.ytReceived)} ${market.symbol} YT with a ${formatApy(quote.estimatedBreakEvenApy)} break-even APY and ${formatTokenAmount(quote.estimatedYieldExposure)} ${market.symbol} estimated yield exposure. Price impact is ${quote.priceImpact}%; ${fee}.`;
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
