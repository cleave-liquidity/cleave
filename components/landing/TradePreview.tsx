"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { DataModeBadge } from "@/components/layout/DataModeBadge";
import { AssetIcon } from "@/components/markets/AssetIcon";
import { useFixedYieldQuote } from "@/hooks/useFixedYieldQuote";
import { useLongYieldQuote } from "@/hooks/useLongYieldQuote";
import { useMarkets } from "@/hooks/useMarkets";
import { useNetworkGuard } from "@/hooks/useNetworkGuard";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { formatApy, formatTokenAmount } from "@/lib/utils/formatters";
import type { YieldMarket } from "@/types/market";
import type { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import { DEFAULT_TICKET, marketHref, pickFeaturedMarket } from "./featuredMarket";

// ─────────────────────────────────────────────────────────────────────────────
// "Open a position" walkthrough, straight from the product brief:
//   Fixed Yield: Select Market → Fixed → Enter Amount → Review Quote → Approve → Confirm → Open PT Position
//   Long Yield:  Select Market → Long  → Enter Amount → Review YT exposure + risk → Approve → Confirm → Open YT Position
// First layer speaks in strategies (Fixed / Long); PT and YT only appear as "powered by".
//
// Data: nothing here is hardcoded. The market comes from `useMarkets()`, quotes from
// `useFixedYieldQuote` / `useLongYieldQuote`, the icon from `AssetIcon`, the data-mode
// badge from `DataModeBadge` — so it follows whatever adapter (mock or live) is active
// and shows exactly the numbers the market page will show after the click.
//
// On roomy desktops the section is pinned and scroll drives the active step; everywhere
// else it is a normal stack where the steps are tapped.
// ─────────────────────────────────────────────────────────────────────────────

type Strategy = "fixed" | "long";
type RateCase = "lowerRate" | "currentRate" | "higherRate";

const STEP_COUNT = 3;
/** Keep in sync with `.trade-runway` / `.trade-pin` in globals.css. */
const PIN_QUERY = "(min-width: 1024px) and (min-height: 700px)";
const STEP_HYSTERESIS = 0.09; // in steps: stops the step flickering at a boundary
const QUOTE_DEBOUNCE_MS = 350; // one quote per pause in typing, not per keystroke
const MAX_AMOUNT = 10_000_000;
const AMOUNT_SHORTCUTS = [100, 500, 1_000] as const; // used while no wallet balance is known

const RATE_CASES: ReadonlyArray<{ key: RateCase; label: string }> = [
  { key: "lowerRate", label: "Rate drops" },
  { key: "currentRate", label: "Rate now" },
  { key: "higherRate", label: "Rate rises" },
];

const COMPARISON: ReadonlyArray<readonly [label: string, fixed: string, long: string]> = [
  ["You get", "A set amount at maturity", "The yield the vault actually pays"],
  ["Rate moves", "Payout unchanged", "Payout moves with it"],
  ["Risk", "Low — price is locked", "Higher — value can be lost"],
];

// Full class names (Tailwind can't see dynamically built ones).
const TONE = {
  fixed: {
    text: "text-ice",
    dot: "bg-ice",
    rail: "border-ice",
    card: "border-ice/55 bg-ice/[0.06] shadow-[0_0_30px_rgba(169,200,238,0.07)]",
    soft: "border-ice/25 bg-ice/[0.07]",
    cta: "bg-ice shadow-[0_4px_24px_rgba(169,200,238,0.25)]",
    seg: "bg-ice text-[#0A0C10]",
  },
  long: {
    text: "text-amber",
    dot: "bg-amber",
    rail: "border-amber",
    card: "border-amber/55 bg-amber/[0.06] shadow-[0_0_30px_rgba(240,168,92,0.07)]",
    soft: "border-amber/25 bg-amber/[0.07]",
    cta: "bg-amber shadow-[0_4px_24px_rgba(240,168,92,0.25)]",
    seg: "bg-amber text-[#0A0C10]",
  },
} as const;
type Tone = (typeof TONE)[Strategy];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const signed = (n: number, digits = 1) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}%`;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Keeps showing the last good quote while the next one loads (marked stale), instead of blanking. */
function useHeldQuote<T>(quote: T | null, active: boolean) {
  const [held, setHeld] = useState<T | null>(null);
  useEffect(() => {
    if (quote) setHeld(quote);
  }, [quote]);
  return { quote: active ? (quote ?? held) : null, stale: active && !quote && held !== null };
}

type Scenario = { apy: number; returnAmount: number; percentChange: number };

/**
 * The three lending-rate cases. Uses the quote's own `estimatedReturns` when the adapter
 * provides them; live quotes may not, so otherwise they are derived from the quote's
 * normalized fields (YT received, underlying / implied APY, days to maturity).
 */
function rateScenarios(q: LongYieldQuote | null): Record<RateCase, Scenario> | null {
  if (!q) return null;
  if (q.estimatedReturns) return q.estimatedReturns;
  const fraction = Math.max(q.daysToMaturity, 1) / 365;
  const at = (apy: number): Scenario => {
    const returnAmount = q.ytReceived * (apy / 100) * fraction;
    return {
      apy: Number(apy.toFixed(2)),
      returnAmount: Number(returnAmount.toFixed(2)),
      percentChange: q.inputAmount > 0 ? Number((((returnAmount - q.inputAmount) / q.inputAmount) * 100).toFixed(1)) : 0,
    };
  };
  return {
    lowerRate: at(Math.max(0, Math.min(q.underlyingApy, q.impliedApy) * 0.75)),
    currentRate: at(q.underlyingApy),
    higherRate: at(Math.max(q.underlyingApy, q.impliedApy) * 1.2),
  };
}

/** Everything a step needs to render. */
interface StepCtx {
  market: YieldMarket;
  strategy: Strategy;
  tone: Tone;
  isFixed: boolean;
  amountStr: string;
  amount: number;
  amountValid: boolean;
  fixedQuote: FixedYieldQuote | null;
  longQuote: LongYieldQuote | null;
  stale: boolean;
  rateCase: RateCase;
  setStrategy: (s: Strategy) => void;
  setAmountStr: (v: string) => void;
  setRateCase: (r: RateCase) => void;
  walletLabel: string;
  shortcuts: ReadonlyArray<{ label: string; value: number }>;
}

export function TradePreview() {
  const [step, setStep] = useState(0);
  const [strategy, setStrategy] = useState<Strategy>("fixed");
  const [amountStr, setAmountStr] = useState(String(DEFAULT_TICKET));
  const [rateCase, setRateCase] = useState<RateCase>("currentRate");

  const runwayRef = useRef<HTMLElement>(null);
  const stepRef = useRef(0); // source of truth for scroll logic (no stale closures)
  const lockUntil = useRef(0); // while travelling to a clicked step, scroll must not re-pick the step

  // ─── Data: normalized market + quotes through the existing hooks ──────────
  const { markets, isLoading: marketsLoading, error: marketsError } = useMarkets();
  const market = useMemo(() => pickFeaturedMarket(markets), [markets]);
  const { address, isConnected } = useNetworkGuard();
  const { balance, error: balanceError } = useTokenBalance(address, market?.quoteAsset ?? "");

  const amount = Number(amountStr);
  const amountValid = amountStr.trim() !== "" && Number.isFinite(amount) && amount > 0 && amount <= MAX_AMOUNT;
  const quoteAmount = useDebounced(amountValid ? amount : 0, QUOTE_DEBOUNCE_MS);
  const fixedHook = useFixedYieldQuote(market?.id ?? "", quoteAmount);
  const longHook = useLongYieldQuote(market?.id ?? "", quoteAmount);
  const fixed = useHeldQuote(fixedHook.quote, amountValid);
  const long = useHeldQuote(longHook.quote, amountValid);
  const stale = amountValid && (quoteAmount !== amount || fixed.stale || long.stale);

  const isFixed = strategy === "fixed";
  const tone = TONE[strategy];
  const marketOpen = market ? market.status !== "paused" && market.status !== "matured" : false;
  const canOpen = Boolean(market) && amountValid && marketOpen;

  const hasBalance = isConnected && !balanceError && balance > 0;
  const shortcuts = hasBalance
    ? ([["25%", 0.25], ["50%", 0.5], ["MAX", 1]] as const).map(([label, k]) => ({ label, value: Number((balance * k).toFixed(2)) }))
    : AMOUNT_SHORTCUTS.map((v) => ({ label: formatTokenAmount(v, 0), value: v }));
  const walletLabel =
    market && isConnected && !balanceError ? `WALLET: ${formatTokenAmount(balance)} ${market.quoteAsset}` : "CONNECT WALLET FOR BALANCE";

  // ─── Scroll → step (pinned desktop) ───────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    const sync = () => {
      raf = 0;
      const runway = runwayRef.current;
      if (!runway || !window.matchMedia(PIN_QUERY).matches) return;
      if (performance.now() < lockUntil.current) return;
      const travel = runway.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      const raw = clamp(-runway.getBoundingClientRect().top / travel, 0, 1) * STEP_COUNT;
      let next = stepRef.current;
      if (raw > next + 1 + STEP_HYSTERESIS && next < STEP_COUNT - 1) next = Math.min(STEP_COUNT - 1, Math.floor(raw));
      else if (raw < next - STEP_HYSTERESIS && next > 0) next = Math.max(0, Math.floor(raw));
      if (next !== stepRef.current) {
        stepRef.current = next;
        setStep(next);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule(); // e.g. reload mid-section
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  /** Select a step; when pinned, glide the page to that step's slice of the runway. */
  const goToStep = useCallback((index: number) => {
    const next = clamp(index, 0, STEP_COUNT - 1);
    stepRef.current = next;
    setStep(next);
    const runway = runwayRef.current;
    if (!runway || !window.matchMedia(PIN_QUERY).matches) return;
    const top = runway.getBoundingClientRect().top + window.scrollY;
    const travel = runway.offsetHeight - window.innerHeight;
    lockUntil.current = performance.now() + 900;
    window.scrollTo({
      top: Math.round(top + ((next + 0.5) / STEP_COUNT) * travel),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  const quoteAsset = market?.quoteAsset ?? "the quote asset";
  const steps = [
    {
      tab: "Strategy",
      title: "Choose your strategy",
      body: "Predictable yield, or exposure to future yield. PT and YT power them behind the scenes.",
    },
    {
      tab: "Amount",
      title: "Enter your amount",
      body: `Everything settles in ${quoteAsset}. The quote updates as you type — price impact included.`,
    },
    {
      tab: "Review",
      title: "Review and open",
      body: "See what you get at maturity, the risk and the fees. Then approve, confirm, done.",
    },
  ];

  const ctx: StepCtx | null = market
    ? {
        market,
        strategy,
        tone,
        isFixed,
        amountStr,
        amount,
        amountValid,
        fixedQuote: fixed.quote,
        longQuote: long.quote,
        stale,
        rateCase,
        setStrategy,
        setAmountStr,
        setRateCase,
        walletLabel,
        shortcuts,
      }
    : null;

  const checkout = market ? marketHref(market.id, strategy, amountValid ? amount : undefined) : "/markets";

  return (
    <section id="trade" ref={runwayRef} className="trade-runway relative mt-24 select-none sm:mt-32 lg:mt-28">
      <div className="trade-pin">
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.95fr_1.25fr] lg:gap-16">
            {/* ── Left: story + steps ── */}
            <div data-reveal className="flex flex-col gap-5">
              <div className="mono flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ice" />
                04 — OPEN A POSITION
              </div>
              <h2 className="m-0 text-[36px] font-normal leading-[1.04] tracking-[-0.035em] text-balance sm:text-[48px] lg:text-[54px]">
                Same market.
                <br />
                <span className="text-muted">Pick a side.</span>
              </h2>
              <p className="m-0 max-w-[460px] text-[15px] font-light leading-[1.6] text-muted sm:text-[16px]">
                Fixed tells you exactly what you&apos;ll have at maturity. Long takes exposure to future yield — and shows
                you the risk before you commit.
              </p>

              <ol aria-label="Steps" className="m-0 mt-1 flex max-w-[460px] list-none flex-col gap-2 p-0">
                {steps.map((s, i) => {
                  const active = i === step;
                  const done = i < step;
                  return (
                    <li key={s.tab}>
                      <button
                        type="button"
                        onClick={() => goToStep(i)}
                        aria-current={active ? "step" : undefined}
                        className={`flex w-full items-start gap-4 border-l-2 px-4 py-3 text-left transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice ${
                          active ? `${tone.rail} bg-surface/70` : "border-white/10 hover:border-white/25"
                        }`}
                      >
                        <span
                          className={`mono mt-0.5 flex h-6 w-7 shrink-0 items-center justify-center rounded text-[12px] font-semibold transition-colors duration-300 ${
                            active ? tone.seg : done ? "bg-white/15 text-foreground" : "bg-white/10 text-muted"
                          }`}
                        >
                          {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : `0${i + 1}`}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className={`text-[15px] font-medium transition-colors duration-300 ${active ? "text-foreground" : "text-muted"}`}>
                            {s.title}
                          </span>
                          {/* Only the active step spells itself out — keeps the pinned column short. */}
                          <span
                            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                              active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            }`}
                          >
                            <span className="overflow-hidden text-[13px] leading-relaxed text-muted">
                              <span className="block pt-1">{s.body}</span>
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <p className="sr-only" aria-live="polite">
                Step {step + 1} of {STEP_COUNT}: {steps[step].title}
              </p>
            </div>

            {/* ── Right: terminal preview ── */}
            <div
              data-reveal="1"
              aria-busy={marketsLoading}
              className="flex flex-col gap-4 rounded-2xl border border-white/15 bg-surface/90 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] sm:p-6"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                {market ? (
                  <div className="flex min-w-0 items-center gap-3">
                    <AssetIcon
                      symbol={market.assetMetadata?.symbol ?? market.symbol}
                      name={market.assetMetadata?.name ?? market.name}
                      iconUrl={market.assetMetadata?.iconUrl}
                      size="sm"
                    />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[16px] font-medium text-foreground sm:truncate">
                        {market.assetMetadata?.name ?? market.name}
                      </span>
                      <span className="mono text-[10px] tracking-[0.1em] text-muted-dark">
                        {(market.protocolMetadata?.name ?? market.sourceProtocol ?? market.yieldSource).toUpperCase()} · MATURITY{" "}
                        {market.maturity.toUpperCase()} · {market.daysRemaining} DAYS
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3" aria-hidden="true">
                    <span className="h-8 w-8 rounded-full bg-white/10 motion-safe:animate-pulse" />
                    <span className="flex flex-col gap-1.5">
                      <span className="h-3.5 w-36 rounded bg-white/10 motion-safe:animate-pulse" />
                      <span className="h-2.5 w-56 rounded bg-white/[0.07] motion-safe:animate-pulse" />
                    </span>
                  </div>
                )}
                {market && (
                  <span className="hidden shrink-0 sm:block">
                    <DataModeBadge mode={market.dataMode} />
                  </span>
                )}
              </div>

              {/* Step tabs (the same control as the list on the left, for touch and keyboard users) */}
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-surface-raised p-1" role="group" aria-label="Walkthrough step">
                {steps.map((s, i) => (
                  <button
                    key={s.tab}
                    type="button"
                    onClick={() => goToStep(i)}
                    aria-pressed={i === step}
                    className={`mono flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg text-[11px] tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ice ${
                      i === step ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"
                    }`}
                  >
                    <span className={i === step ? tone.text : "text-muted-dark"}>0{i + 1}</span>
                    {s.tab}
                  </button>
                ))}
              </div>

              {/* Step body — a fixed minimum height (pinned layout) so the group never jumps between steps */}
              <div key={step} className="trade-step-in trade-step-body flex flex-col gap-3">
                {ctx ? (
                  <>
                    {step === 0 && <StrategyStep {...ctx} />}
                    {step === 1 && <AmountStep {...ctx} />}
                    {step === 2 && <ReviewStep {...ctx} />}
                  </>
                ) : (
                  <MarketState loading={marketsLoading} failed={Boolean(marketsError)} />
                )}
              </div>

              {/* Action */}
              <div className="flex flex-col gap-2">
                {step < STEP_COUNT - 1 ? (
                  <button
                    type="button"
                    onClick={() => goToStep(step + 1)}
                    disabled={!market || (step === 1 && !amountValid)}
                    className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] text-[14px] font-medium text-foreground transition-colors hover:border-white/40 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
                  >
                    {step === 0 ? `Continue with ${isFixed ? "Fixed" : "Long"} Yield` : "Review quote"} →
                  </button>
                ) : canOpen ? (
                  <Link
                    href={checkout}
                    className={`flex min-h-[48px] items-center justify-center rounded-xl text-[15px] font-medium text-[#0A0C10] transition-all hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice ${tone.cta}`}
                  >
                    Open {isFixed ? "Fixed" : "Long"} Position →
                  </Link>
                ) : market && !marketOpen ? (
                  <button
                    type="button"
                    disabled
                    className="flex min-h-[48px] cursor-not-allowed items-center justify-center rounded-xl border border-white/15 text-[14px] font-medium text-muted-dark"
                  >
                    Market {market.status === "paused" ? "paused" : "expired"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    disabled={!market}
                    className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/20 text-[14px] font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
                  >
                    Fix the amount to continue
                  </button>
                )}
                <span className="mono text-center text-[10px] tracking-[0.1em] text-muted-dark">
                  APPROVE {market ? market.quoteAsset.toUpperCase() : "TOKEN"} → CONFIRM → POSITION OPENED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────

function MarketState({ loading, failed }: { loading: boolean; failed: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[230px] rounded-xl border border-white/10 bg-surface-raised/50 motion-safe:animate-pulse" />
          ))}
        </div>
        <div className="h-[84px] rounded-lg bg-white/[0.04] motion-safe:animate-pulse" />
      </div>
    );
  }
  return (
    <div role="status" className="flex flex-1 flex-col items-start justify-center gap-3 rounded-xl border border-white/10 bg-surface-raised/50 p-6">
      <span className="text-[15px] text-foreground">{failed ? "Market data is unavailable right now." : "No open markets yet."}</span>
      <span className="text-[13px] leading-relaxed text-muted">
        The walkthrough follows the live market list. You can still browse every market directly.
      </span>
      <Link href="/markets" className="mono text-[12px] tracking-[0.08em] text-ice hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice">
        VIEW ALL MARKETS →
      </Link>
    </div>
  );
}

function StrategyStep({ market, isFixed, setStrategy, fixedQuote, longQuote }: StepCtx) {
  return (
    <>
      <div role="radiogroup" aria-label="Strategy" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StrategyCard
          kind="fixed"
          selected={isFixed}
          onSelect={() => setStrategy("fixed")}
          title="Fixed Yield"
          tagline="Lock a predictable rate until maturity."
          figure={formatApy(fixedQuote?.quotedFixedApy ?? market.impliedApy)}
          figureLabel={fixedQuote ? "Quoted fixed APY" : "Implied APY"}
          note={`Market implied ${formatApy(market.impliedApy)}`}
          powered="Powered by PT"
          chip="PREDICTABLE"
        />
        <StrategyCard
          kind="long"
          selected={!isFixed}
          onSelect={() => setStrategy("long")}
          title="Long Yield"
          tagline="Take exposure to changing yield before maturity."
          figure={longQuote ? formatApy(longQuote.estimatedBreakEvenApy) : "—"}
          figureLabel="Break-even APY"
          note={`Rate now ${formatApy(market.underlyingApy)}`}
          powered="Powered by YT"
          chip="VARIABLE"
        />
      </div>

      {/* Fixed vs Long in three lines — understood in seconds, per the brief. */}
      <dl className="m-0 grid grid-cols-[88px_1fr_1fr] gap-x-3 text-[12px] leading-snug">
        {COMPARISON.map(([label, fixed, long], i) => (
          <div key={label} className={`col-span-3 grid grid-cols-subgrid items-baseline py-2 ${i === 0 ? "" : "border-t border-white/10"}`}>
            <dt className="mono text-[10px] uppercase tracking-[0.12em] text-muted-dark">{label}</dt>
            <dd className={`m-0 ${isFixed ? "text-foreground" : "text-muted"}`}>{fixed}</dd>
            <dd className={`m-0 ${isFixed ? "text-muted" : "text-foreground"}`}>{long}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function AmountStep({
  market,
  isFixed,
  tone,
  amountStr,
  amount,
  amountValid,
  fixedQuote,
  longQuote,
  stale,
  setAmountStr,
  walletLabel,
  shortcuts,
}: StepCtx) {
  const dim = stale ? "opacity-50 transition-opacity" : "transition-opacity";
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="mono flex justify-between text-[11px] text-muted-dark">
          <label htmlFor="preview-amount">YOU PAY</label>
          <span>{walletLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-surface-raised px-4 transition-colors focus-within:border-white/40">
          <input
            id="preview-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            aria-invalid={!amountValid}
            className="mono min-h-[56px] min-w-0 flex-grow border-0 bg-transparent text-[26px] font-medium text-foreground outline-none"
          />
          <span className="text-[15px] font-medium text-muted">{market.quoteAsset}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shortcuts.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setAmountStr(String(s.value))}
              className="mono rounded border border-white/15 px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
            >
              {s.label}
            </button>
          ))}
          {amountStr.trim() !== "" && !amountValid && (
            <span role="alert" className="text-[12px] text-negative">
              Enter an amount greater than zero.
            </span>
          )}
        </div>
      </div>

      <div className={`flex flex-col gap-1 rounded-xl border p-4 ${tone.soft}`}>
        <span className="text-[13px] text-muted-dark">{isFixed ? `You'll receive on ${market.maturity}` : "You earn the yield on"}</span>
        <div className={`mono flex flex-wrap items-baseline gap-2 text-[30px] leading-none tracking-[-0.02em] text-foreground ${dim}`}>
          {isFixed ? (
            <span>{fixedQuote ? formatTokenAmount(fixedQuote.estimatedMaturityValue) : "—"}</span>
          ) : (
            <span>{longQuote ? `~${formatTokenAmount(longQuote.estimatedYieldExposure, 0)}` : "—"}</span>
          )}
          <span className="text-[15px] text-muted">{market.symbol}</span>
        </div>
        <span className={`mono text-[12px] ${tone.text} ${dim}`}>
          {isFixed
            ? fixedQuote
              ? `+${formatTokenAmount(fixedQuote.estimatedMaturityValue - amount)} ${market.symbol} · locked ${fixedQuote.quotedFixedApy}% APY`
              : "—"
            : longQuote
              ? `until ${market.maturity} · break-even ${longQuote.estimatedBreakEvenApy}%`
              : "—"}
        </span>
      </div>

      <dl className={`m-0 flex flex-col text-[13px] ${dim}`}>
        <Row
          label={isFixed ? "PT received" : "YT received"}
          value={`${formatTokenAmount((isFixed ? fixedQuote?.ptReceived : longQuote?.ytReceived) ?? 0)} ${isFixed ? "PT" : "YT"}-${market.symbol}`}
          tone={tone.text}
        />
        <Row label="Price impact" value={`${(isFixed ? fixedQuote?.priceImpact : longQuote?.priceImpact) ?? 0}%`} last />
      </dl>
    </>
  );
}

function ReviewStep({ market, isFixed, tone, amount, fixedQuote, longQuote, stale, rateCase, setRateCase }: StepCtx) {
  const dim = stale ? "opacity-50 transition-opacity" : "transition-opacity";
  const scenarios = rateScenarios(longQuote);
  const scenario = scenarios?.[rateCase];

  // Fixed holds still; compare it with simply holding the vault at the chosen lending rate.
  const fixedValue = fixedQuote?.estimatedMaturityValue ?? null;
  const days = fixedQuote?.daysToMaturity ?? market.daysRemaining;
  const floatingValue = scenario ? amount * (1 + (scenario.apy / 100) * (days / 365)) : null;
  const edge = fixedValue !== null && floatingValue !== null ? fixedValue - floatingValue : null;

  return (
    <>
      {/* Fixed vs Long in one glance: change the lending rate, watch what moves. */}
      <div className="flex flex-col gap-2">
        <span className="mono text-[11px] uppercase tracking-[0.14em] text-muted-dark">If the lending rate…</span>
        <div role="group" aria-label="Lending rate scenario" className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-surface-raised p-1">
          {RATE_CASES.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={rateCase === c.key}
              onClick={() => setRateCase(c.key)}
              className={`mono min-h-[32px] rounded-md text-[11px] tracking-[0.04em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ice ${
                rateCase === c.key ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {c.label}
              {scenarios ? ` · ${scenarios[c.key].apy}%` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className={`flex flex-col gap-1 rounded-xl border p-4 ${tone.soft} ${dim}`}>
        {isFixed ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-muted-dark">You&apos;ll receive on {market.maturity}</span>
              <span className="mono inline-flex items-center gap-1 rounded border border-ice/30 px-2 py-0.5 text-[10px] tracking-[0.12em] text-ice">
                <Lock className="h-3 w-3" aria-hidden="true" /> LOCKED
              </span>
            </div>
            <div className="mono flex flex-wrap items-baseline gap-2 text-[30px] leading-none tracking-[-0.02em] text-foreground">
              <span>{fixedValue !== null ? formatTokenAmount(fixedValue) : "—"}</span>
              <span className="text-[15px] text-muted">{market.symbol}</span>
            </div>
            {/* The lock only freezes *this* number — the comparison below is what the switch changes. */}
            <div key={rateCase} className="trade-swap mt-2 grid grid-cols-2 gap-3 border-t border-white/10 pt-2.5">
              <div className="flex flex-col">
                <span className="mono text-[9px] uppercase tracking-[0.12em] text-muted-dark">Fixed · stays</span>
                <span className="mono text-[15px] text-ice">{fixedValue !== null ? formatTokenAmount(fixedValue) : "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="mono text-[9px] uppercase tracking-[0.12em] text-muted-dark">
                  Floating at {scenario ? formatApy(scenario.apy) : "—"}
                </span>
                <span className="mono text-[15px] text-muted-light">{floatingValue !== null ? formatTokenAmount(floatingValue) : "—"}</span>
              </div>
              <span className="col-span-2 text-[12px] leading-snug text-muted">
                {edge === null
                  ? "Pick a lending rate to compare."
                  : edge >= 0
                    ? `At this rate Fixed finishes ${formatTokenAmount(edge)} ${market.symbol} ahead of simply holding the vault.`
                    : `At this rate holding the vault would finish ${formatTokenAmount(-edge)} ${market.symbol} ahead — that gap is the price of certainty.`}
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="text-[13px] text-muted-dark">Estimated yield streamed to maturity</span>
            <div key={rateCase} className="trade-swap mono flex flex-wrap items-baseline gap-2 text-[30px] leading-none tracking-[-0.02em] text-foreground">
              <span>~{scenario ? formatTokenAmount(scenario.returnAmount) : "—"}</span>
              <span className="text-[15px] text-muted">{market.symbol}</span>
              {scenario && (
                <span className={`text-[13px] ${scenario.percentChange >= 0 ? "text-positive" : "text-negative"}`}>{signed(scenario.percentChange)}</span>
              )}
            </div>
            <span className="text-[12px] leading-relaxed text-muted">Moves with the rate the vault actually pays — that&apos;s the bet.</span>
          </>
        )}
      </div>

      {!isFixed && (
        <div role="note" className="rounded-lg border border-amber/40 bg-amber/10 p-3 text-[12px] leading-[1.5] text-muted-light">
          <strong className="font-medium text-amber">Risk: </strong>
          If the underlying yield is lower than the implied yield you paid for, a large portion of the position value can be lost.
        </div>
      )}

      <dl className={`m-0 flex flex-col text-[13px] ${dim}`}>
        {isFixed ? (
          <>
            <Row
              label="Quoted fixed APY · implied"
              value={fixedQuote ? `${formatApy(fixedQuote.quotedFixedApy)} · ${formatApy(market.impliedApy)}` : "—"}
              tone="text-ice"
            />
            <Row label="PT received" value={`${formatTokenAmount(fixedQuote?.ptReceived ?? 0)} PT-${market.symbol}`} />
            <Row
              label="Price impact · network fee"
              value={fixedQuote ? `${fixedQuote.priceImpact}% · ${feeLabel(fixedQuote.networkFeeEstimate)}` : "—"}
              last
            />
          </>
        ) : (
          <>
            <Row label="YT received" value={`${formatTokenAmount(longQuote?.ytReceived ?? 0)} YT-${market.symbol}`} />
            <Row
              label="Break-even APY"
              value={longQuote ? `${formatApy(longQuote.estimatedBreakEvenApy)} · rate now ${formatApy(market.underlyingApy)}` : "—"}
              tone="text-amber"
            />
            <Row
              label="Price impact · network fee"
              value={longQuote ? `${longQuote.priceImpact}% · ${feeLabel(longQuote.networkFeeEstimate)}` : "—"}
              last
            />
          </>
        )}
      </dl>
    </>
  );
}

/** Network fee as the quote reports it (live quotes may not know it yet). */
function feeLabel(fee: number | undefined): string {
  return fee === undefined || fee === null ? "fee at confirm" : `~${fee} ETH`;
}

function StrategyCard({
  kind,
  selected,
  onSelect,
  title,
  tagline,
  figure,
  figureLabel,
  note,
  powered,
  chip,
}: {
  kind: Strategy;
  selected: boolean;
  onSelect: () => void;
  title: string;
  tagline: string;
  figure: string;
  figureLabel: string;
  note: string;
  powered: string;
  chip: string;
}) {
  const tone = TONE[kind];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`group relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice ${
        selected ? tone.card : "border-white/15 bg-surface-raised/50 hover:border-white/25"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
          <span className={`text-[16px] font-medium ${tone.text}`}>{title}</span>
        </span>
        {selected ? (
          <Check className={`h-4 w-4 ${tone.text}`} aria-hidden="true" />
        ) : (
          <span className="mono text-[9px] tracking-[0.12em] text-muted-dark">{chip}</span>
        )}
      </span>
      <span className="text-[13px] leading-snug text-muted">{tagline}</span>
      <Sparkline kind={kind} />
      <span className="flex items-end justify-between gap-2">
        <span className="flex flex-col">
          <span className="mono text-[9px] uppercase tracking-[0.14em] text-muted-dark">{figureLabel}</span>
          <span className="mono text-[22px] leading-tight text-foreground">{figure}</span>
        </span>
        <span className="mono text-right text-[10px] leading-tight text-muted-dark">{note}</span>
      </span>
      <span className="mono text-[9px] tracking-[0.14em] text-muted-dark">{powered.toUpperCase()}</span>
    </button>
  );
}

/** Fixed looks calm; Long looks alive — the whole difference, drawn in one line. */
function Sparkline({ kind }: { kind: Strategy }) {
  return (
    <svg viewBox="0 0 200 40" className="h-12 w-full" aria-hidden="true" preserveAspectRatio="none">
      {kind === "fixed" ? (
        <path d="M2 30 C 60 26, 120 16, 198 8" fill="none" stroke="#A9C8EE" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path
          d="M2 24 C 14 6, 26 6, 38 20 S 62 36, 76 20 S 100 4, 114 18 S 140 34, 154 16 S 182 6, 198 14"
          fill="none"
          stroke="#F0A85C"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function Row({ label, value, tone, last }: { label: string; value: string; tone?: string; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-2 ${last ? "" : "border-b border-white/10"}`}>
      <dt className="text-muted-dark">{label}</dt>
      <dd className={`mono m-0 text-right ${tone ?? "text-muted"}`}>{value}</dd>
    </div>
  );
}
