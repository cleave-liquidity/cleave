"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { DataModeBadge } from "@/components/layout/DataModeBadge";
import { AssetIcon, ProtocolIcon } from "@/components/markets/AssetIcon";
import { MarketMetricsStrip } from "@/components/markets/MarketMetricsStrip";
import { TradePanel, type TradeQuoteContext } from "@/components/trade/TradePanel";
import { formatApy, formatNetworkFee, formatPriceImpact, formatTokenAmount } from "@/lib/utils/formatters";
import type { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import type { QuoteUiState } from "@/lib/markets/quote-state";
import { YieldMarket } from "@/types/market";
import { getMarketStatus, isMarketTradable } from "@/lib/markets/status";
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
  const isTradeable = isMarketTradable(market);
  const marketStatus = getMarketStatus(market);
  const isMaturing = marketStatus === "maturing";

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
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/trade"
              className="inline-flex items-center gap-2 text-[14px] text-muted hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Tradeable Markets</span>
            </Link>
            <Link
              href={`/markets/${market.id}`}
              className="text-[13px] text-ice hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice"
            >
              View Market Details →
            </Link>
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3.5">
                  <AssetIcon
                    symbol={assetSymbol}
                    name={assetName}
                    iconUrl={market.assetMetadata?.iconUrl}
                    size="lg"
                  />
                  <div>
                    <div className="mono mb-1 text-[11px] uppercase tracking-[0.16em] text-muted-dark">
                      {assetSymbol} / Trade Yield
                    </div>
                    <h1 className="text-[28px] sm:text-[34px] font-normal tracking-[-0.02em] m-0 text-foreground">
                      {assetName}
                    </h1>
                    <span className="text-[14px] text-muted">
                      {sourceName} · Built on Robinhood Chain
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <DataModeBadge mode={market.dataMode} />
                  <span className="mono text-[12px] text-muted-dark border border-white/15 rounded-full pl-1.5 pr-3 py-1 flex items-center gap-1.5">
                    <ProtocolIcon
                      name={market.yieldSourceMetadata?.name || sourceName}
                      iconUrl={market.yieldSourceMetadata?.iconUrl || market.protocolMetadata?.iconUrl}
                      size="xs"
                    />
                    {sourceName}
                  </span>
                  <span className="mono text-[12px] text-muted-light border border-white/15 rounded-full px-3 py-1 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: isMaturing ? "#EF5F22" : "#3B86FF" }}
                      aria-hidden="true"
                    />
                    <span className="capitalize">{marketStatus}</span>
                  </span>
                </div>
              </div>
            </div>

            <MarketMetricsStrip market={market} />
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-start">
            <div className="flex flex-col gap-4 max-w-[620px]">
              <div className="mono text-[11px] tracking-[0.14em] text-muted-dark uppercase">
                Choose how to trade this yield
              </div>
              <div
                role="group"
                aria-label="Yield strategy"
                className="grid grid-cols-2 border border-white/20 rounded-lg overflow-hidden"
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
                  Trading Yield
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
                <div className="border border-white/15 rounded-[10px] bg-surface p-5 sm:p-7 text-center">
                  <div className="mono text-[11px] uppercase tracking-[0.14em] text-muted-dark">
                    Execution unavailable
                  </div>
                  <p className="mt-3 text-[14px] leading-6 text-muted">
                    {marketStatus === "paused"
                      ? "This market is currently paused and cannot be traded."
                      : "This market has passed maturity and cannot be traded."}
                  </p>
                </div>
              ) : (
                <div className="border border-white/15 rounded-[10px] bg-surface p-5 sm:p-6 flex flex-col gap-3">
                  <div className="mono text-[11px] uppercase tracking-[0.14em] text-muted-dark">Choose how to trade this yield</div>
                  <StrategyChoice
                    tone="ice"
                    title="Fixed Yield"
                    figure={formatApy(market.impliedApy)}
                    caption="Lock a quoted yield toward maturity"
                    onSelect={() => handleStrategyChange("fixed")}
                  />
                  <StrategyChoice
                    tone="amber"
                    title="Trading Yield"
                    figure={formatApy(market.underlyingApy)}
                    caption="Trade exposure to future yield"
                    onSelect={() => handleStrategyChange("long")}
                  />
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
        Choose Fixed Yield or Trading Yield to get a quote for this market.
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
  const marketIsTradeable = isMarketTradable(market);

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
        ["How it works", "You buy at a discount and target the quoted maturity value (PT)."],
        ["At maturity", "Redeem for the underlying asset."],
        ["Before maturity", "Sell early at the prevailing market price."],
        ["Key risk", "Early exit can result in a different realized outcome."],
      ]
    : [
        ["How it works", "You get exposure to future yield as rates move (YT)."],
        ["While active", "Accrued yield can be claimed while the position is active."],
        ["At maturity", "The position expires. It does not redeem principal."],
        ["Key risk", "The position can lose value if realized yield underperforms market expectations."],
      ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className={`text-[24px] font-normal ${fixed ? "text-ice" : "text-amber"}`}>
          {fixed ? "Fixed Yield" : "Trading Yield"}
        </h2>
        <p className="mt-2 text-[16px] leading-7 text-muted">
          {fixed
            ? "Lock a quoted yield toward maturity."
            : "Trade exposure to future yield as rates move."}
        </p>
      </div>

      <div className="border-y border-white/10 py-3">
        <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">This market</div>
        <p className="mt-2 text-[14px] leading-6 text-muted">
          {assetName} ({assetSymbol}) · {sourceLabel}. The market is pricing {formatApy(market.impliedApy)} implied APY
          against {formatApy(market.underlyingApy)} current underlying APY, with {timeRemaining} until {market.maturity}.
        </p>
        <p className="mt-2 text-[13px] leading-6 text-muted-dark">
          {fixed
            ? `Held to maturity, Fixed Yield follows the quote you accept. Selling early is priced by the market, so the result can differ.`
            : `Trading Yield follows realized yield: you can claim yield while the position is active, and it expires on ${market.maturity}.`}
        </p>
      </div>

      <div className="border-b border-white/10 pb-3">
        <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Your quote</div>
        <p className="mt-2 text-[14px] leading-6 text-muted">{positionContext}</p>
      </div>

      <dl className="border-y border-white/10">
        {points.map(([label, value]) => (
          <div key={label} className="grid gap-1 border-b border-white/10 py-3 last:border-b-0 sm:grid-cols-[120px_1fr] sm:gap-6">
            <dt className="mono text-[11px] uppercase tracking-[0.12em] text-muted-dark">{label}</dt>
            <dd className="m-0 text-[13px] leading-6 text-muted-light">{value}</dd>
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
  if (quoteState === "quoting") return `Fetching a live Fixed Yield quote for ${inputAmount ?? "your"} ${market.quoteAsset}.`;
  if (quoteState === "unavailable") return "No route is available for this amount right now. Try a different amount.";
  if (quoteState === "error") return "We couldn't fetch a live Fixed Yield quote. Retry before acting on these numbers.";
  if (quoteState !== "ready" || !quote || inputAmount === null) {
    return `Enter an amount to see what you'd receive, your quoted APY, the maturity value, price impact and fee for ${market.symbol}.`;
  }

  const fee = quote.networkFeeEstimate === undefined
    ? "the network fee is shown before confirmation"
    : `the estimated network fee is ${formatNetworkFee(quote.networkFeeEstimate)}`;
  return `For ${formatTokenAmount(inputAmount)} ${market.quoteAsset}, the quote returns ${formatTokenAmount(quote.ptReceived)} ${market.symbol} at a quoted ${formatApy(quote.quotedFixedApy)} APY. It estimates ${formatTokenAmount(quote.estimatedMaturityValue)} ${market.symbol} at maturity with ${formatPriceImpact(quote.priceImpact)} price impact; ${fee}.`;
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
  if (quoteState === "quoting") return `Fetching a live Trading Yield quote for ${inputAmount ?? "your"} ${market.quoteAsset}.`;
  if (quoteState === "unavailable") return "No route is available for this amount right now. Try a different amount.";
  if (quoteState === "error") return "We couldn't fetch a live Trading Yield quote. Retry before acting on these numbers.";
  if (quoteState !== "ready" || !quote || inputAmount === null) {
    return `Enter an amount to see what you'd receive, the break-even APY, your yield exposure, price impact and fee for ${market.symbol}.`;
  }

  const fee = quote.networkFeeEstimate === undefined
    ? "the network fee is shown before confirmation"
    : `the estimated network fee is ${formatNetworkFee(quote.networkFeeEstimate)}`;
  return `For ${formatTokenAmount(inputAmount)} ${market.quoteAsset}, the quote returns ${formatTokenAmount(quote.ytReceived)} YT (${market.symbol}) with a ${formatApy(quote.estimatedBreakEvenApy)} break-even APY and ${formatTokenAmount(quote.estimatedYieldExposure)} ${market.symbol} of estimated yield exposure. Price impact is ${formatPriceImpact(quote.priceImpact)}; ${fee}.`;
}

function StrategyChoice({
  tone,
  title,
  figure,
  caption,
  onSelect,
}: {
  tone: "ice" | "amber";
  title: string;
  figure: string;
  caption: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-[88px] items-center justify-between gap-4 border p-4 text-left transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice ${
        tone === "ice"
          ? "border-ice/25 bg-ice/5 hover:border-ice/55 hover:bg-ice/10"
          : "border-amber/25 bg-amber/5 hover:border-amber/55 hover:bg-amber/10"
      }`}
    >
      <span>
        <span className={`block text-[15px] font-medium ${tone === "ice" ? "text-ice" : "text-amber"}`}>{title}</span>
        <span className="mono mt-1 block text-[10px] uppercase tracking-wider text-muted-dark">{caption}</span>
      </span>
      <span className="mono text-[22px] text-foreground">{figure}</span>
    </button>
  );
}
