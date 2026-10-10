"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatUnits, parseUnits } from "viem";
import { toast } from "sonner";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import {
  OptionsTransactionRevertedError,
  optionsErrorMessage,
  useYieldRateOptions,
  type OptionsKind,
} from "@/hooks/useYieldRateOptions";
import { getOptionsBreakevenRate, getOptionsTestnetStrikeLadder } from "@/lib/options/options-economics";
import {
  buildOptionsPayoffChartModel,
  calculateOptionsDevelopmentPreview,
  calculateOptionsNetProfit,
  calculateOptionsScenarioPayout,
  OPTIONS_DEVELOPMENT_PREVIEW_RATE,
} from "@/lib/options/options-preview";
import { OPTIONS_TESTNET_CHAIN_ID, optionsExplorerBase } from "@/lib/options/options-contract";

const MARKET_ROUTE_ID = "testnet-usdg-rate";
const PREVIEW_DECIMALS = 6;
const PREVIEW_SYMBOL = "yDEVUSD";
const RATE_SCALE = BigInt("1000000000000000000");
const RATE_PER_BPS = BigInt("100000000000000");
const PLOT = { left: 56, right: 392, top: 40, bottom: 190 } as const;
type OptionsMarketMode = "mainnet-preview" | "testnet-development";

function rateLabel(rate: bigint | undefined): string {
  return rate === undefined ? "—" : `${Number(formatUnits(rate, 16)).toFixed(2)}%`;
}

function expiryLabel(expiry: bigint): string {
  return `${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(Number(expiry) * 1000))} UTC`;
}

function formatAmount(value: bigint, decimals: number): string {
  return Number(formatUnits(value, decimals)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function formatSignedAmount(value: bigint): string {
  const absolute = value < BigInt(0) ? -value : value;
  const sign = value > BigInt(0) ? "+" : value < BigInt(0) ? "−" : "";
  return `${sign}${formatAmount(absolute, PREVIEW_DECIMALS)}`;
}

export function OptionsMarketClient({ optionId, mode = "testnet-development" }: { optionId?: bigint; mode?: OptionsMarketMode }) {
  const mainnetPreview = mode === "mainnet-preview";
  const options = useYieldRateOptions(mainnetPreview ? undefined : optionId, !mainnetPreview);
  const [kind, setKind] = useState<OptionsKind>("CALL");
  const [selectedStrike, setSelectedStrike] = useState("");
  const [notional, setNotional] = useState("100");
  const [txHash, setTxHash] = useState<string>();
  const [txStatus, setTxStatus] = useState<string>();
  const [quoteCreatedAt, setQuoteCreatedAt] = useState<number>();
  const [nowSeconds, setNowSeconds] = useState<bigint>();
  const [scenarioRateBps, setScenarioRateBps] = useState(500);
  const scenarioRef = useRef<HTMLDivElement>(null);
  const chartId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    const update = () => setNowSeconds(BigInt(Math.floor(Date.now() / 1000)));
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const strikes = useMemo(() => getOptionsTestnetStrikeLadder(OPTIONS_DEVELOPMENT_PREVIEW_RATE), []);
  const strike = strikes.find((value) => value.toString() === selectedStrike) ?? strikes[1] ?? strikes[0];
  let previewNotional = BigInt(0);
  let inputError: string | undefined;
  try {
    previewNotional = parseUnits(notional || "0", PREVIEW_DECIMALS);
    if (previewNotional <= BigInt(0)) inputError = "Enter a notional greater than zero.";
  } catch {
    inputError = "Enter a valid amount with up to 6 decimal places.";
  }
  let liveNotional = previewNotional;
  if (options.readState) {
    try { liveNotional = options.parseCollateral(notional); } catch { liveNotional = BigInt(0); }
  }
  const preview = nowSeconds !== undefined && strike !== undefined && !inputError
    ? calculateOptionsDevelopmentPreview({ kind, strike, notional: previewNotional, nowSeconds })
    : undefined;
  const quote = options.quote;
  const collateralCompatible = Boolean(options.readState?.collateralSymbol === PREVIEW_SYMBOL && options.readState.collateralDecimals === PREVIEW_DECIMALS);
  const quoteWithinWindow = quoteCreatedAt !== undefined && nowSeconds !== undefined && Number(nowSeconds) >= quoteCreatedAt && Number(nowSeconds) - quoteCreatedAt <= 300;
  const quoteMatchesForm = Boolean(quote && quote.kind === kind && quote.strike === strike && quote.notional === liveNotional);
  const liveQuote = Boolean(quote && quote.fresh && quoteWithinWindow && quoteMatchesForm);
  const walletReady = Boolean(options.connectedAddress && options.connectedChainId === OPTIONS_TESTNET_CHAIN_ID);
  const enoughVault = Boolean(liveQuote && options.readState && options.readState.availableCollateral >= quote!.notional);
  const enoughBalance = Boolean(liveQuote && options.readState?.walletCollateralBalance !== undefined && options.readState.walletCollateralBalance >= quote!.premium);
  const approved = Boolean(liveQuote && options.readState?.premiumAllowance !== undefined && options.readState.premiumAllowance >= quote!.premium);
  const canQuote = Boolean(!mainnetPreview && options.configured && options.readState?.fresh && collateralCompatible && previewNotional > BigInt(0) && !inputError && !options.isPending);
  const canApprove = Boolean(!mainnetPreview && liveQuote && walletReady && enoughVault && enoughBalance && !approved && !options.isPending);
  const canOpen = Boolean(!mainnetPreview && liveQuote && walletReady && enoughVault && enoughBalance && approved && !options.isPending);
  const premium = liveQuote ? quote?.premium : preview?.premium;
  const expiry = liveQuote ? quote?.expiry : preview?.expiry;
  const breakeven = liveQuote && quote ? getOptionsBreakevenRate(quote.kind, quote.strike, quote.premium, quote.notional) : preview?.breakevenRate;
  const displayDecimals = liveQuote && options.readState ? options.readState.collateralDecimals : PREVIEW_DECIMALS;
  const displaySymbol = liveQuote && options.readState ? options.readState.collateralSymbol : mainnetPreview ? "reference units" : PREVIEW_SYMBOL;
  const chartStrike = liveQuote && quote ? quote.strike : preview?.strike;
  const chartNotional = liveQuote && quote ? quote.notional : preview?.notional;
  const maxPayout = chartStrike !== undefined && chartNotional !== undefined
    ? calculateOptionsScenarioPayout(kind, chartStrike, chartNotional, kind === "CALL" ? RATE_SCALE : BigInt(0))
    : undefined;
  const chartRate = liveQuote && quote ? quote.currentRate : OPTIONS_DEVELOPMENT_PREVIEW_RATE;
  const chart = chartStrike !== undefined && chartNotional !== undefined && premium !== undefined
    ? buildOptionsPayoffChartModel({ kind, strike: chartStrike, notional: chartNotional, premium, currentRate: chartRate })
    : undefined;
  const minBps = chart ? Number(chart.minRate / RATE_PER_BPS) : 0;
  const maxBps = chart ? Number(chart.maxRate / RATE_PER_BPS) : 0;
  const activeBps = Math.min(maxBps, Math.max(minBps, scenarioRateBps));
  const scenarioRate = BigInt(activeBps) * RATE_PER_BPS;
  const scenarioProfit = chart && chartStrike !== undefined && chartNotional !== undefined
    ? calculateOptionsNetProfit(kind, chartStrike, chartNotional, premium ?? BigInt(0), scenarioRate)
    : undefined;
  const rates = chart
    ? [...chart.points.map((point) => point.rate), scenarioRate].sort((a, b) => a < b ? -1 : a > b ? 1 : 0).filter((rate, index, all) => index === 0 || rate !== all[index - 1])
    : [];
  const plotX = (rate: bigint) => chart ? PLOT.left + Number(((rate - chart.minRate) * BigInt(PLOT.right - PLOT.left)) / (chart.maxRate - chart.minRate)) : PLOT.left;
  const plotY = (pnl: bigint) => chart ? PLOT.bottom - Number(((pnl - chart.minProfit) * BigInt(PLOT.bottom - PLOT.top)) / (chart.maxProfit - chart.minProfit)) : PLOT.bottom;
  const points = rates.map((rate) => ({ rate, pnl: calculateOptionsNetProfit(kind, chartStrike ?? BigInt(0), chartNotional ?? BigInt(0), premium ?? BigInt(0), rate) }));
  const polyline = points.map(({ rate, pnl }) => `${plotX(rate)},${plotY(pnl)}`).join(" ");
  const zeroY = plotY(BigInt(0));
  const strikeX = chart ? plotX(chart.strike) : undefined;
  const breakevenX = chart?.breakevenRate === undefined ? undefined : plotX(chart.breakevenRate);
  const scenarioX = chart ? plotX(scenarioRate) : undefined;
  const scenarioY = scenarioProfit === undefined ? undefined : plotY(scenarioProfit);
  const capX = chart?.payoutCapRate !== undefined && chart.payoutCapRate >= chart.minRate && chart.payoutCapRate <= chart.maxRate ? plotX(chart.payoutCapRate) : undefined;
  const midRate = chart ? (chart.minRate + chart.maxRate) / BigInt(2) : undefined;

  const clearQuote = () => { options.clearQuote(); setQuoteCreatedAt(undefined); };
  const buildTerms = () => {
    if (mainnetPreview || !options.readState || !collateralCompatible || nowSeconds === undefined || strike === undefined || previewNotional <= BigInt(0) || liveNotional <= BigInt(0)) return undefined;
    return { strike, expiry: nowSeconds + BigInt(30 * 24 * 60 * 60), notional: liveNotional, deadline: nowSeconds + BigInt(300) };
  };
  const handleQuote = async () => {
    if (mainnetPreview) return;
    const terms = buildTerms();
    if (!terms) { toast.error(inputError || "A fresh Testnet contract read is required before quoting."); return; }
    try { await options.getQuote({ kind, ...terms }); setQuoteCreatedAt(Number(nowSeconds ?? BigInt(0))); setTxStatus(undefined); }
    catch (error) { toast.error(optionsErrorMessage(error)); }
  };
  const handleApprove = async () => {
    if (mainnetPreview || !quote || !canApprove) return;
    setTxStatus("WAITING FOR WALLET AND TESTNET RECEIPT");
    try { const hash = await options.approvePremium(quote.premium); setTxHash(hash); setTxStatus("APPROVAL CONFIRMED"); toast.success("Premium allowance confirmed on Testnet."); }
    catch (error) { if (error instanceof OptionsTransactionRevertedError) { setTxHash(error.hash); setTxStatus("APPROVAL REVERTED"); } else setTxStatus("APPROVAL NOT CONFIRMED"); toast.error(optionsErrorMessage(error)); }
  };
  const handleOpen = async () => {
    if (mainnetPreview || !quote || !canOpen) return;
    if (!quoteWithinWindow) { clearQuote(); toast.error("Quote window elapsed. Read a fresh quote before opening."); return; }
    setTxStatus("WAITING FOR WALLET AND TESTNET RECEIPT");
    try {
      const hash = await options.openOption({ kind: quote.kind, strike: quote.strike, expiry: quote.expiry, notional: quote.notional, maximumPremium: quote.premium, deadline: BigInt(Math.floor(Date.now() / 1000) + 300) });
      setTxHash(hash); setTxStatus("OPTION OPEN CONFIRMED"); toast.success("Option opening confirmed on Robinhood Chain Testnet.");
    } catch (error) { if (error instanceof OptionsTransactionRevertedError) { setTxHash(error.hash); setTxStatus("OPEN REVERTED"); } else setTxStatus("OPEN NOT CONFIRMED"); toast.error(optionsErrorMessage(error)); }
  };
  const handleSettle = async () => {
    setTxStatus("WAITING FOR SETTLEMENT RECEIPT");
    try { const hash = await options.settleOption(); setTxHash(hash); setTxStatus("SETTLEMENT CONFIRMED"); toast.success("Option settlement confirmed on Testnet."); }
    catch (error) { if (error instanceof OptionsTransactionRevertedError) { setTxHash(error.hash); setTxStatus("SETTLEMENT REVERTED"); } else setTxStatus("SETTLEMENT NOT CONFIRMED"); toast.error(optionsErrorMessage(error)); }
  };
  const handleClaim = async () => {
    setTxStatus("WAITING FOR CLAIM RECEIPT");
    try { const hash = await options.claimOption(); setTxHash(hash); setTxStatus("CLAIM CONFIRMED"); toast.success("Option payout claim confirmed on Testnet."); }
    catch (error) { if (error instanceof OptionsTransactionRevertedError) { setTxHash(error.hash); setTxStatus("CLAIM REVERTED"); } else setTxStatus("CLAIM NOT CONFIRMED"); toast.error(optionsErrorMessage(error)); }
  };
  const exploreScenarios = () => {
    const target = scenarioRef.current;
    if (!target) return;
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    window.requestAnimationFrame(() => target.querySelector("input")?.focus());
  };
  const walletOwnsOption = options.position?.owner.toLowerCase() === options.connectedAddress?.toLowerCase();
  const settlementSnapshotReady = Boolean(options.position && options.readState?.fresh && options.readState.observedAt >= options.position.expiry);
  const settlementTimeReached = Boolean(options.position && nowSeconds !== undefined && nowSeconds > options.position.expiry);

  return (
    <section className="overflow-hidden border border-white/15 bg-surface/70 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5 sm:pb-6">
        <div className="max-w-[660px]"><div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">YELTRA / RATE OPTIONS · 30-DAY EUROPEAN</div><h1 className="mt-2 text-[28px] font-normal tracking-[-0.035em] text-foreground sm:text-[36px]">Yield Rate Options</h1><p className="mb-0 mt-2 text-[13px] leading-5 text-muted">{mainnetPreview ? "Model how a change in reference yield could affect a CALL or PUT." : "Explore the separate Robinhood Testnet development market."}</p></div>
        <div className="flex items-center gap-3"><span className="mono inline-flex min-h-8 items-center gap-2 border border-amber/30 bg-amber/[0.04] px-3 text-[9px] uppercase tracking-[0.12em] text-amber" data-testid="options-preview-badge"><span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />{mainnetPreview ? "PREVIEW · MAINNET TRADING NOT LIVE" : "TESTNET · DEVELOPMENT ONLY"}</span>{!mainnetPreview && <ConnectButton />}</div>
      </header>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] xl:gap-5">
        <div className="min-w-0 border border-white/10 bg-background/50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><div className="mono text-[9px] uppercase tracking-[0.14em] text-muted-dark">Position direction</div><div className="mt-1 text-[12px] text-muted">Choose the rate move you expect</div></div><div className="flex rounded-sm border border-white/10 p-1" role="group" aria-label="Option direction">{(["CALL", "PUT"] as const).map((direction) => <button key={direction} type="button" aria-pressed={kind === direction} data-testid={`options-${direction.toLowerCase()}`} onClick={() => { setKind(direction); clearQuote(); }} className={`min-h-9 min-w-[76px] px-3 font-mono text-[11px] tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice ${kind === direction ? "bg-amber text-background" : "text-muted hover:text-foreground"}`}>{direction}</button>)}</div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)]">
            <fieldset className="min-w-0 border-0 p-0"><legend className="mono text-[9px] uppercase tracking-[0.14em] text-muted-dark">Strike rate</legend><div className="mt-2 grid grid-cols-3 gap-2" data-testid="options-strike-selector">{strikes.map((value) => <button key={value.toString()} type="button" aria-pressed={strike === value} onClick={() => { setSelectedStrike(value.toString()); clearQuote(); }} className={`min-h-10 border px-2 font-mono text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice ${strike === value ? "border-amber/50 bg-amber/[0.08] text-amber" : "border-white/10 text-muted hover:border-white/25 hover:text-foreground"}`}>{rateLabel(value)}</button>)}</div></fieldset>
            <label htmlFor="options-notional" className="block min-w-0"><span className="mono text-[9px] uppercase tracking-[0.14em] text-muted-dark">Notional</span><span className="mt-2 flex h-10 items-center border border-white/10 bg-surface px-3 focus-within:border-white/30"><input id="options-notional" type="number" min="0.01" step="0.01" value={notional} onChange={(event) => { setNotional(event.target.value); clearQuote(); }} inputMode="decimal" aria-invalid={Boolean(inputError)} aria-describedby={inputError ? "options-notional-error" : "options-notional-unit"} className="h-full min-w-0 flex-1 bg-transparent font-mono text-[13px] text-foreground outline-none" data-testid="options-notional" /><span id="options-notional-unit" className="ml-2 shrink-0 text-[10px] text-muted-dark">{mainnetPreview ? "ref. units" : "yDEVUSD"}</span></span></label>
          </div>
          {inputError && <p id="options-notional-error" className="mb-0 mt-2 text-[11px] text-amber">{inputError}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-y border-white/[0.07] py-3"><p className="m-0 text-[12px] leading-5 text-muted">{kind === "CALL" ? "CALL · benefits if the reference rate finishes above the strike." : "PUT · benefits if the reference rate finishes below the strike."}</p><span className="mono shrink-0 text-[10px] text-muted-dark">EXPIRY · 30 DAYS</span></div>

          <div className="mt-5" data-testid="options-payoff-chart"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="m-0 text-[15px] font-normal text-foreground">Payoff at expiry</h2><p className="mb-0 mt-1 text-[10px] text-muted-dark">Net result after illustrative premium · reference units</p></div><div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-muted-dark" aria-label="Chart legend"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />Profit</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-negative" aria-hidden="true" />Loss</span></div></div>
            {chart && polyline && strikeX !== undefined && <svg viewBox="0 0 410 236" role="img" aria-label={`${kind} estimated net profit and loss at expiry across a local yield-rate range from ${rateLabel(chart.minRate)} to ${rateLabel(chart.maxRate)}.`} className="mt-3 block h-auto w-full overflow-visible" data-testid="options-payoff-plot">
              <defs><clipPath id={`${chartId}-profit`}><rect x={PLOT.left} y={PLOT.top} width={PLOT.right - PLOT.left} height={Math.max(0, zeroY - PLOT.top)} /></clipPath><clipPath id={`${chartId}-loss`}><rect x={PLOT.left} y={zeroY} width={PLOT.right - PLOT.left} height={Math.max(0, PLOT.bottom - zeroY)} /></clipPath></defs>
              {[PLOT.top, zeroY, PLOT.bottom].map((y, index) => <line key={y} x1={PLOT.left} y1={y} x2={PLOT.right} y2={y} stroke="#ECEDEA" strokeOpacity={index === 1 ? 0.28 : 0.08} />)}
              <text x="3" y={PLOT.top + 4} fill="#8E9390" fontSize="9">{formatSignedAmount(chart.maxProfit)}</text><text x="3" y={zeroY + 3} fill="#8E9390" fontSize="9">0</text><text x="3" y={PLOT.bottom + 3} fill="#8E9390" fontSize="9">{formatSignedAmount(chart.minProfit)}</text>
              {breakevenX !== undefined && <line x1={breakevenX} y1={PLOT.top} x2={breakevenX} y2={PLOT.bottom} stroke="#3B86FF" strokeOpacity="0.7" strokeDasharray="3 4" />}<line x1={strikeX} y1={PLOT.top} x2={strikeX} y2={PLOT.bottom} stroke="#ECEDEA" strokeOpacity="0.7" strokeDasharray="5 4" />{capX !== undefined && <line x1={capX} y1={PLOT.top} x2={capX} y2={PLOT.bottom} stroke="#8E9390" strokeOpacity="0.65" strokeDasharray="2 4" />}
              <polyline points={polyline} fill="none" stroke="#F07A2B" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${chartId}-profit)`} /><polyline points={polyline} fill="none" stroke="#F08A7A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${chartId}-loss)`} />
              {scenarioX !== undefined && scenarioY !== undefined && <><line x1={scenarioX} y1={PLOT.top} x2={scenarioX} y2={PLOT.bottom} stroke="#ECEDEA" strokeOpacity="0.35" strokeDasharray="2 5" /><circle cx={scenarioX} cy={scenarioY} r="4" fill={scenarioProfit !== undefined && scenarioProfit >= BigInt(0) ? "#F07A2B" : "#F08A7A"} stroke="#030304" strokeWidth="2" /></>}
              {[{ rate: chart.minRate, anchor: "start" as const }, { rate: midRate ?? chart.minRate, anchor: "middle" as const }, { rate: chart.maxRate, anchor: "end" as const }].map(({ rate, anchor }) => <text key={`${rate}-${anchor}`} x={plotX(rate)} y="218" textAnchor={anchor} fill="#8E9390" fontSize="10">{rateLabel(rate)}</text>)}
              <text x={strikeX} y="14" textAnchor="middle" fill="#ECEDEA" fontSize="9">STRIKE</text>{breakevenX !== undefined && <text x={breakevenX} y="32" textAnchor="middle" fill="#3B86FF" fontSize="9">BREAKEVEN</text>}{capX !== undefined && <text x={capX} y="32" textAnchor="middle" fill="#8E9390" fontSize="9">PAYOUT CAP</text>}
            </svg>}
            {chart && scenarioProfit !== undefined && <div ref={scenarioRef} id="options-payoff-scenarios" className="mt-3 border-t border-white/[0.07] pt-3" data-testid="options-scenario-explorer"><div className="flex flex-wrap items-baseline justify-between gap-2"><label htmlFor="options-scenario-rate" className="text-[11px] text-muted">Try a reference rate</label><output htmlFor="options-scenario-rate" className="font-mono text-[11px] text-foreground">{rateLabel(scenarioRate)} <span className={scenarioProfit >= BigInt(0) ? "text-amber" : "text-negative"}>· {scenarioProfit > BigInt(0) ? "profit" : scenarioProfit < BigInt(0) ? "loss" : "breakeven"} {formatSignedAmount(scenarioProfit)} {displaySymbol}</span></output></div><input id="options-scenario-rate" type="range" min={minBps} max={maxBps} step="1" value={activeBps} onChange={(event) => setScenarioRateBps(Number(event.target.value))} aria-label="Illustrative yield rate at expiry" aria-valuetext={`${rateLabel(scenarioRate)} reference rate`} className="mt-2 h-2 w-full cursor-pointer accent-[#F07A2B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice" data-testid="options-scenario-rate" /><div className="flex justify-between font-mono text-[9px] text-muted-dark"><span>{rateLabel(chart.minRate)}</span><span>{rateLabel(chart.maxRate)}</span></div></div>}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.07] pt-3 text-[9px] text-muted-dark"><span className="inline-flex items-center gap-1.5"><i className="h-3 border-l border-dashed border-white/70" aria-hidden="true" />Strike</span><span className="inline-flex items-center gap-1.5"><i className="h-3 border-l border-dashed border-ice" aria-hidden="true" />Breakeven</span><span>Gross payout follows the rate distance and is capped at notional</span></div>
        </div>

        <aside className="min-w-0 border border-white/10 bg-surface p-4 sm:p-5 xl:sticky xl:top-36">
          <div className="flex items-center justify-between gap-3"><div className="mono text-[9px] uppercase tracking-[0.14em] text-muted-dark">{liveQuote ? "Testnet contract quote" : "Illustrative estimate"}</div><span className={`mono text-[9px] uppercase tracking-[0.1em] ${liveQuote ? "text-positive" : "text-amber"}`}>{liveQuote ? "LIVE · TESTNET" : "PREVIEW"}</span></div>
          {quote && !liveQuote && <p className="mb-0 mt-3 text-[11px] leading-4 text-amber">Quote no longer matches these terms or expired. Read a fresh quote before using Testnet actions.</p>}
          <div className="mt-4 border-b border-white/10 pb-4"><div className="text-[11px] text-muted-dark">{liveQuote ? "Premium" : "Illustrative premium"}</div><div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="font-mono text-[30px] tracking-[-0.04em] text-amber sm:text-[34px]" data-testid="options-preview-premium">{premium === undefined ? "—" : formatAmount(premium, displayDecimals)}</span><span className="text-[11px] text-muted-dark">{displaySymbol}</span></div></div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-[11px]"><div><dt className="text-muted-dark">Maximum loss</dt><dd className="mb-0 mt-1 font-mono text-foreground">{premium === undefined ? "—" : `${formatAmount(premium, displayDecimals)} ${displaySymbol}`}</dd></div><div><dt className="text-muted-dark">Maximum payout</dt><dd className="mb-0 mt-1 font-mono text-foreground">{maxPayout === undefined ? "—" : `${formatAmount(maxPayout, displayDecimals)} ${displaySymbol}`}</dd></div><div><dt className="text-muted-dark">Breakeven</dt><dd className="mb-0 mt-1 font-mono text-foreground">{premium === undefined ? "—" : breakeven === undefined ? "Outside range" : rateLabel(breakeven)}</dd></div><div><dt className="text-muted-dark">Strike</dt><dd className="mb-0 mt-1 font-mono text-foreground">{chartStrike === undefined ? "—" : rateLabel(chartStrike)}</dd></div><div><dt className="text-muted-dark">Expiry</dt><dd className="mb-0 mt-1 font-mono text-foreground">{liveQuote && expiry !== undefined ? expiryLabel(expiry) : "30 days · preview"}</dd></div><div><dt className="text-muted-dark">Direction</dt><dd className="mb-0 mt-1 font-mono text-foreground">{kind}</dd></div></dl>
          {!mainnetPreview && options.readState && <div className="mt-4 border-t border-white/[0.07] pt-3 text-[10px] text-muted-dark"><div className="flex justify-between gap-3"><span>Testnet rate index</span><span className={options.readState.fresh ? "text-positive" : "text-amber"}>{options.readState.fresh ? `${rateLabel(options.readState.currentRate)} · fresh` : "stale"}</span></div><div className="mt-2 flex justify-between gap-3"><span>Vault capacity</span><span className="font-mono text-muted">{formatAmount(options.readState.availableCollateral, options.readState.collateralDecimals)} {options.readState.collateralSymbol}</span></div>{options.readState.walletCollateralBalance !== undefined && <div className="mt-2 flex justify-between gap-3"><span>Wallet balance</span><span className="font-mono text-muted">{formatAmount(options.readState.walletCollateralBalance, options.readState.collateralDecimals)} {options.readState.collateralSymbol}</span></div>}</div>}

          <div className="mt-5 border-t border-white/10 pt-4">
            {mainnetPreview ? <><p className="mb-3 text-[11px] leading-5 text-muted">Mainnet trading is not live. Use the control to explore local payoff scenarios.</p><button type="button" onClick={() => { const target = scenarioRef.current; if (!target) return; target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" }); window.requestAnimationFrame(() => target.querySelector("input")?.focus()); }} className="inline-flex h-10 w-full items-center justify-center border border-amber/45 bg-amber/[0.06] px-4 text-[11px] font-medium text-amber transition-colors hover:border-amber/70 hover:bg-amber/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">Explore payoff scenarios ↓</button></>
              : !liveQuote ? <><button type="button" onClick={handleQuote} disabled={!canQuote} className="inline-flex h-10 w-full items-center justify-center bg-amber px-4 text-[11px] font-medium text-background transition-colors hover:bg-amber-primary disabled:cursor-not-allowed disabled:opacity-50">{options.isPending ? "Reading quote…" : "Get live Testnet quote"}</button>{!options.configured && <p className="mb-0 mt-2 text-[10px] leading-4 text-muted-dark">Testnet deployment is not configured in this build.</p>}{options.configured && !options.readState?.fresh && <p className="mb-0 mt-2 text-[10px] leading-4 text-muted-dark">A fresh development rate is required for a contract quote.</p>}{options.readState && !collateralCompatible && <p className="mb-0 mt-2 text-[10px] leading-4 text-muted-dark">Configured collateral does not match the 6-decimal yDEVUSD development token.</p>}{inputError && <p className="mb-0 mt-2 text-[10px] leading-4 text-amber">{inputError}</p>}</>
              : !walletReady ? <p className="mb-0 text-[11px] leading-5 text-muted">Connect a wallet on Robinhood Chain Testnet · 46630 to continue.</p>
              : !enoughBalance ? <p className="mb-0 text-[11px] leading-5 text-muted">This wallet needs enough yDEVUSD for the quoted premium. yDEVUSD is development collateral, not USDG or USDC.</p>
              : !enoughVault ? <p className="mb-0 text-[11px] leading-5 text-muted">The Testnet vault does not have enough available collateral for this notional.</p>
              : !approved ? <button type="button" onClick={handleApprove} disabled={!canApprove} className="inline-flex h-10 w-full items-center justify-center border border-white/20 px-4 text-[11px] text-foreground transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50">{options.isPending ? "Waiting for approval…" : "Approve premium on Testnet"}</button>
              : <button type="button" onClick={handleOpen} disabled={!canOpen} className="inline-flex h-10 w-full items-center justify-center bg-amber px-4 text-[11px] font-medium text-background transition-colors hover:bg-amber-primary disabled:cursor-not-allowed disabled:opacity-50">{options.isPending ? "Waiting for confirmation…" : "Open Testnet option"}</button>}
            {liveQuote && !quoteWithinWindow && <p className="mb-0 mt-2 text-[10px] text-amber">Quote expired. Read a fresh quote before continuing.</p>}{txStatus && <p role="status" className="mb-0 mt-3 text-[10px] text-muted">{txStatus}</p>}{txHash && <p className="mb-0 mt-2 break-all font-mono text-[9px] text-muted-dark"><a href={`${optionsExplorerBase}/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline">Testnet receipt · {txHash}</a></p>}{options.lastOpenedOptionId !== undefined && <Link className="mt-3 inline-block text-[11px] text-ice hover:text-white" href={`/options/${MARKET_ROUTE_ID}?optionId=${options.lastOpenedOptionId}`}>View confirmed position #{options.lastOpenedOptionId.toString()} →</Link>}
          </div>

          <details className="mt-4 border-t border-white/[0.07] pt-3 text-[10px] text-muted-dark"><summary className="cursor-pointer list-none text-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">Technical details</summary><p className="mb-0 mt-3 leading-5">{mainnetPreview ? "Mainnet contracts, underlying, production rate source, realized-rate settlement method, collateral and reviewed pricing are not configured. The 5.00% reference and deterministic premium formula are illustrative only; no wallet action, executable quote, or Portfolio position is available." : "This isolated Testnet market uses operator-published development rates and yDEVUSD collateral. It is not a production yield oracle or stablecoin. Live contract actions require a fresh quote, sufficient vault collateral, a Testnet wallet, and confirmed allowance. No Mainnet Options deployment is configured."}</p>{!mainnetPreview && options.error && <p className="mb-0 mt-2 leading-5">Current Testnet read: {options.error}</p>}</details>
        </aside>
      </div>

      {optionId !== undefined && <div className="mt-5 border-t border-white/10 pt-5">{!options.position ? <p className="mb-0 text-[11px] text-muted-dark">{!options.configured ? "No Testnet deployment is configured; no on-chain position is shown." : options.isLoading ? "Reading this option from Testnet…" : "No on-chain option exists for this ID."}</p> : <><div className="mono text-[9px] uppercase tracking-[0.14em] text-muted-dark">Testnet development · on-chain option #{optionId.toString()}</div><div className="mt-3 grid gap-3 text-[11px] sm:grid-cols-4"><div><span className="text-muted-dark">Owner</span><span className="mt-1 block break-all font-mono text-muted">{options.position.owner}</span></div><div><span className="text-muted-dark">Status</span><span className="mt-1 block font-mono text-foreground">{["OPEN", "SETTLED", "CLAIMED"][options.position.state] || "UNKNOWN"}</span></div><div><span className="text-muted-dark">Settlement rate</span><span className="mt-1 block font-mono text-amber">{options.position.settlementRate ? rateLabel(options.position.settlementRate) : "Pending"}</span></div><div><span className="text-muted-dark">Payout</span><span className="mt-1 block font-mono text-foreground">{options.position.payout ? `${options.formatCollateral(options.position.payout)} ${options.readState?.collateralSymbol}` : "—"}</span></div></div><div className="mt-4 flex flex-wrap items-center gap-3">{options.position.state === 0 && settlementTimeReached && settlementSnapshotReady && <button type="button" onClick={handleSettle} disabled={!walletReady || options.isPending} className="inline-flex h-10 items-center justify-center border border-white/20 px-4 text-[11px] text-foreground hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50">Settle from Testnet snapshot</button>}{options.position.state === 0 && !settlementTimeReached && <span className="text-[11px] text-muted-dark">Settlement available after {expiryLabel(options.position.expiry)}.</span>}{options.position.state === 0 && settlementTimeReached && !settlementSnapshotReady && <span className="text-[11px] text-amber">Expired · waiting for a fresh rate observation timestamped at or after expiry.</span>}{options.position.state === 1 && <button type="button" onClick={handleClaim} disabled={!walletReady || options.isPending || !walletOwnsOption} className="inline-flex h-10 items-center justify-center bg-amber px-4 text-[11px] font-medium text-background hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">Claim payout</button>}{options.position.state === 1 && !walletOwnsOption && <span className="text-[11px] text-muted-dark">Only the connected on-chain owner on Testnet can claim.</span>}{!walletReady && options.position.state !== 2 && <span className="text-[11px] text-amber">Connect a wallet on Testnet · 46630 for settlement actions.</span>}</div></>}</div>}
    </section>
  );
}
