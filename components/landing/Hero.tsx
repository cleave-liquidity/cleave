"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { HeroVisual } from "./HeroVisual";
import { Navbar } from "@/components/layout/Navbar";
import { ContractAddress } from "./ContractAddress";
import { useFixedYieldQuote } from "@/hooks/useFixedYieldQuote";
import { useLongYieldQuote } from "@/hooks/useLongYieldQuote";
import { useMarkets } from "@/hooks/useMarkets";
import { formatApy } from "@/lib/utils/formatters";
import { DEFAULT_TICKET, pickFeaturedMarket } from "./featuredMarket";
import { buildStages, FALLBACK_STAGES } from "./heroStages";

const STAGE_COUNT = FALLBACK_STAGES.length; // 5
// Scroll runway is CSS-driven (`lg:min-h-[275vh]` below = 55vh × 5 stages) so the
// DOM never changes shape between breakpoints (no remount, no layout jump).
const DESKTOP_QUERY = "(min-width: 1024px)";
const STAGE_SEGMENT = 1 / STAGE_COUNT;
const HYSTERESIS = 0.028; // progress buffer that stops edge flicker
const NAV_TIMEOUT_MS = 1600; // safety net if `scrollend` never fires
// A little longer than the 170ms fade in `.hero-copy` (globals.css), so the old copy is fully gone before the swap.
const COPY_OUT_MS = 210;

const STAGE_SHORT = ["Overview", "Fixed Yield", "Trading Yield", "How It Works", "Markets"];
const STAGE_ACCENT = ["#ECEDEA", "#3B86FF", "#EF5F22", "#DDE8F8", "#34D399"];

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice";

/** Arrow/Home/End roving focus for a horizontal tablist. */
function tabKeyDown(
  e: React.KeyboardEvent,
  count: number,
  current: number,
  select: (i: number) => void
) {
  let next = current;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1) % count;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (current - 1 + count) % count;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = count - 1;
  else return;
  e.preventDefault();
  select(next);
}

/** Stagger index for the copy entrance (see `.hero-rise`). */
const rise = (i: number) => ({ "--i": i }) as React.CSSProperties;

const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Hero() {
  const [activeStage, setActiveStage] = useState(0); // timeline + camera: always current
  const [shownStage, setShownStage] = useState(0); // copy on screen: swaps after the exit animation
  const [copyPhase, setCopyPhase] = useState<"in" | "out">("in");
  const [activeSubTab, setActiveSubTab] = useState(0);

  const runwayRef = useRef<HTMLElement>(null);
  const stageRef = useRef(0); // source of truth for scroll logic (no stale closures)
  const navTargetRef = useRef<{ y: number; stage: number } | null>(null);
  const navTimerRef = useRef<number | null>(null);
  const stageTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const subTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStart = useRef({ x: 0, y: 0 });
  // Continuous stage position (0…4) for the camera; null on mobile.
  const stagePosRef = useRef<number | null>(null);

  // Stage content follows the featured market and its quotes (mock or live).
  const { markets } = useMarkets();
  const featured = useMemo(() => pickFeaturedMarket(markets), [markets]);
  const { quote: fixedQuote } = useFixedYieldQuote(featured?.id ?? "", DEFAULT_TICKET);
  const { quote: longQuote } = useLongYieldQuote(featured?.id ?? "", DEFAULT_TICKET);
  const stages = useMemo(() => buildStages(featured, fixedQuote, longQuote), [featured, fixedQuote, longQuote]);

  // The planet's own labels follow the same market and rate as the copy.
  const planetLabels = useMemo(
    () =>
      featured
        ? {
            fixedPin: `FIXED · ${formatApy(fixedQuote?.quotedFixedApy ?? featured.impliedApy)}`,
            vaultPin: `${featured.symbol.toUpperCase()} MARKET`,
            core: `${featured.symbol.toUpperCase()} · YIELD SPLIT`,
          }
        : undefined,
    [featured, fixedQuote],
  );

  const stage = stages[shownStage];
  const accentColor = STAGE_ACCENT[shownStage];

  const commitStage = useCallback((next: number) => {
    if (next === stageRef.current) return;
    stageRef.current = next;
    setActiveStage(next);
  }, []);

  // Copy swap: the old copy eases out, then the new copy rises in (staggered). The
  // layout change between stages happens while nothing is visible, so there is no
  // one-frame blank and no jump — and a fast scroll through several stages only
  // ever shows the one it lands on.
  useEffect(() => {
    if (activeStage === shownStage) {
      setCopyPhase("in");
      return;
    }
    if (prefersReducedMotion()) {
      setShownStage(activeStage);
      setActiveSubTab(0);
      return;
    }
    setCopyPhase("out");
    const t = window.setTimeout(() => {
      setShownStage(activeStage);
      setActiveSubTab(0);
      setCopyPhase("in");
    }, COPY_OUT_MS);
    return () => window.clearTimeout(t);
  }, [activeStage, shownStage]);

  // ─── Scroll → stage (desktop runway) ──────────────────────────────────────
  // Passive native `scroll` listener, coalesced to one read per frame. It only
  // *reads* scroll position, so it is safe with smooth-scroll engines such as
  // Lenis (which drive the real window scroll).
  useEffect(() => {
    let raf = 0;

    const clearNav = () => {
      navTargetRef.current = null;
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
    };

    const sync = () => {
      raf = 0;
      const runway = runwayRef.current;
      if (!runway || !isDesktop()) {
        stagePosRef.current = null;
        return;
      }

      const top = runway.getBoundingClientRect().top + window.scrollY;
      const travel = runway.offsetHeight - window.innerHeight;
      if (travel <= 0) return;

      const progress = Math.max(0, Math.min(1, (window.scrollY - top) / travel));
      // Stage i is centred at (i + 0.5) / N — the camera rests there and glides in between.
      stagePosRef.current = Math.max(0, Math.min(STAGE_COUNT - 1, progress * STAGE_COUNT - 0.5));

      const nav = navTargetRef.current;
      if (nav) {
        // Travelling to a clicked stage: ignore the stages we fly past.
        if (Math.abs(window.scrollY - nav.y) > 3) return;
        clearNav();
      }

      const current = stageRef.current;

      let next = current;
      if (progress > (current + 1) * STAGE_SEGMENT + HYSTERESIS && current < STAGE_COUNT - 1) {
        next = Math.min(STAGE_COUNT - 1, Math.floor(progress * STAGE_COUNT));
      } else if (progress < current * STAGE_SEGMENT - HYSTERESIS && current > 0) {
        next = Math.max(0, Math.floor(progress * STAGE_COUNT));
      }
      commitStage(next);
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };
    // User takes over mid-travel → stop ignoring their scroll.
    const interrupt = () => {
      if (navTargetRef.current) {
        clearNav();
        schedule();
      }
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("keydown", interrupt);
    window.addEventListener("scrollend", schedule);
    schedule(); // e.g. reload mid-runway: scroll restoration may not fire an event

    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearNav();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("keydown", interrupt);
      window.removeEventListener("scrollend", schedule);
    };
  }, [commitStage]);

  // ─── Stage selection (timeline, pins, swipe, keyboard) ────────────────────
  const handleSelectStage = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(STAGE_COUNT - 1, index));
      const runway = runwayRef.current;

      if (!runway || !isDesktop()) {
        commitStage(target);
        return;
      }

      const top = runway.getBoundingClientRect().top + window.scrollY;
      const travel = runway.offsetHeight - window.innerHeight;
      // Land on the stage centre, far from any threshold.
      const y = Math.round(top + ((target + 0.5) / STAGE_COUNT) * travel);

      // Update UI + camera immediately and fly there without re-triggering
      // every intermediate stage.
      navTargetRef.current = { y, stage: target };
      if (navTimerRef.current !== null) window.clearTimeout(navTimerRef.current);
      navTimerRef.current = window.setTimeout(() => {
        navTargetRef.current = null;
        navTimerRef.current = null;
      }, NAV_TIMEOUT_MS);
      commitStage(target);
      window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    },
    [commitStage]
  );

  const selectStageFromKeyboard = (i: number) => {
    handleSelectStage(i);
    stageTabRefs.current[i]?.focus();
  };

  // ─── Touch swipe (mobile stage change) ────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
    if (Math.abs(dx) > 48 && Math.abs(dx) > dy * 1.4) {
      handleSelectStage(stageRef.current + (dx < 0 ? 1 : -1));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // One stable tree for every breakpoint:
  //   lg+  → section gets the 275vh runway, inner wrapper is sticky (pinned)
  //   <lg  → plain single viewport, swipe / timeline to change stage
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <section
      id="top"
      ref={runwayRef}
      aria-label="Yeltra overview"
      className="relative bg-background lg:min-h-[275vh]"
    >
      <div className="lg:sticky lg:top-0">
        <div
          className="relative h-[100dvh] overflow-hidden flex flex-col justify-between select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Planet visual (decorative — the timeline below is the accessible control) */}
          <div className="absolute inset-0 pointer-events-auto opacity-35 sm:opacity-50 lg:opacity-100 transition-opacity duration-500">
            <HeroVisual
              activeStage={activeStage}
              onSelectStage={handleSelectStage}
              isSplitLayout={true}
              stagePosRef={stagePosRef}
              labels={planetLabels}
            />
          </div>

          {/* Legibility scrims: keep the planet's lines out from under the copy and the navbar */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 pointer-events-none bg-background/25 lg:bg-[linear-gradient(90deg,rgba(3,3,4,0.72)_0%,rgba(3,3,4,0.66)_31%,rgba(3,3,4,0.3)_46%,transparent_60%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 z-10 h-32 pointer-events-none bg-gradient-to-b from-background/85 to-transparent"
          />

          {/* Navbar */}
          <div className="relative z-30 pointer-events-auto">
            <Navbar isLanding={true} />
          </div>

          {/* Main Content */}
          {/* Same 1240px / px-10 container as the Navbar and every section below, so the copy shares the logo's left edge. */}
          <div className="relative z-20 flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-10 flex items-center lg:items-start lg:pt-[clamp(6rem,14vh,10rem)] pointer-events-none pt-20 pb-8 sm:py-0">
            <div className="w-full lg:max-w-[480px] xl:max-w-[520px]">
              <p className="sr-only" aria-live="polite" aria-atomic="true">
                Stage {activeStage + 1} of {STAGE_COUNT}: {stages[activeStage].title} {stages[activeStage].accent}
              </p>

              <div
                id="hero-panel"
                role="tabpanel"
                aria-labelledby={`hero-tab-${shownStage}`}
                data-phase={copyPhase}
                className="hero-copy"
              >
              <div key={shownStage}>
                <div style={rise(0)} className="hero-rise mono flex items-center gap-2 text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-muted mb-2.5 sm:mb-3.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: accentColor }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{stage.tag}</span>
                </div>

                <h1 style={rise(1)} className="hero-rise m-0 text-[28px] xs:text-[32px] sm:text-[44px] lg:text-[58px] leading-[1.06] font-normal tracking-[-0.035em] text-foreground [text-shadow:0_2px_30px_rgba(3,3,4,0.95)]">
                  <span className="block">{stage.title}</span>
                  <span className="block text-balance" style={{ color: accentColor }}>
                    {stage.accent}
                  </span>
                </h1>

                <p style={rise(2)} className="hero-rise mt-3 sm:mt-4 text-[13px] sm:text-[15px] leading-[1.6] text-muted-light font-light max-w-[460px] [text-shadow:0_1px_16px_rgba(3,3,4,0.95)] line-clamp-3 sm:line-clamp-none">
                  {stage.description}
                </p>

                {/* First stage: the two ways in, as cards you can act on right away */}
                {stage.paths && (
                  <div style={rise(3)} className="hero-rise mt-4 sm:mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 max-w-[460px] pointer-events-auto">
                    {stage.paths.map((path) => {
                      const fixed = path.kind === "fixed";
                      return (
                        <Link
                          key={path.kind}
                          href={path.href}
                          className={`group flex flex-col gap-1 border bg-background/60 px-3 py-2.5 sm:px-3.5 sm:py-3 transition-colors ${FOCUS_RING} ${
                            fixed ? "border-ice/35 hover:border-ice/70" : "border-amber/35 hover:border-amber/70"
                          }`}
                        >
                          <span className="flex items-center gap-2 text-[12px] sm:text-[13px] font-medium" style={{ color: fixed ? "#3B86FF" : "#EF5F22" }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fixed ? "#3B86FF" : "#EF5F22" }} aria-hidden="true" />
                            {path.title}
                            <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">→</span>
                          </span>
                          <span className="text-[11px] sm:text-[12px] leading-snug text-muted-light">{path.tagline}</span>
                          <span className="mono mt-0.5 text-[17px] sm:text-[19px] leading-none text-foreground">{path.figure}</span>
                          <span className="mono text-[9px] sm:text-[10px] tracking-[0.04em] text-muted">{path.caption}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Sub-tabs */}
                {!stage.paths && (
                <div
                  role="tablist"
                  aria-label={`${stage.title} details`}
                  style={rise(3)}
                  className="hero-rise flex gap-1.5 sm:gap-2.5 mt-4 sm:mt-5 pointer-events-auto flex-wrap"
                >
                  {stage.subTabs.map((tab, idx) => (
                    <button
                      key={tab}
                      ref={(el) => {
                        subTabRefs.current[idx] = el;
                      }}
                      role="tab"
                      id={`hero-subtab-${idx}`}
                      aria-selected={activeSubTab === idx}
                      aria-controls="hero-subpanel"
                      tabIndex={activeSubTab === idx ? 0 : -1}
                      onClick={() => setActiveSubTab(idx)}
                      onKeyDown={(e) =>
                        tabKeyDown(e, stage.subTabs.length, activeSubTab, (i) => {
                          setActiveSubTab(i);
                          subTabRefs.current[i]?.focus();
                        })
                      }
                      className={`mono text-[10px] sm:text-[11px] tracking-[0.08em] px-2.5 sm:px-3 py-1 sm:py-1.5 border transition-colors duration-200 ${FOCUS_RING} ${
                        activeSubTab === idx
                          ? "border-foreground bg-foreground/15 text-foreground font-medium"
                          : "border-white/10 text-muted hover:border-white/25 hover:text-foreground"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                )}

                {!stage.paths && (
                <div
                  id="hero-subpanel"
                  role="tabpanel"
                  aria-labelledby={`hero-subtab-${activeSubTab}`}
                  style={rise(3)}
                  className="hero-rise mt-2.5 min-h-[36px] sm:min-h-[44px] text-[12px] sm:text-[13px] text-muted leading-relaxed max-w-[460px] [text-shadow:0_1px_8px_rgba(3,3,4,0.9)]"
                >
                  {stage.subDetails[activeSubTab]}
                </div>
                )}

                {/* Stats */}
                <dl style={rise(4)} className="hero-rise flex flex-wrap gap-x-6 sm:gap-x-8 gap-y-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10 max-w-[460px] m-0">
                  {stage.stats.map((st) => (
                    <div key={st.label} className="flex flex-col">
                      <dt className="mono text-[8px] sm:text-[9px] tracking-[0.16em] text-muted uppercase whitespace-nowrap">
                        {st.label}
                      </dt>
                      <dd
                        className="mono text-[12px] sm:text-[15px] font-medium mt-0.5 whitespace-nowrap m-0"
                        style={{ color: st.color || "#ECEDEA" }}
                      >
                        {st.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* CTAs */}
                <div style={rise(5)} className="hero-rise flex items-center gap-2.5 sm:gap-3 flex-wrap mt-5 sm:mt-6 pointer-events-auto">
                  <Link
                    href={stage.primaryCtaHref}
                    className={`inline-flex items-center gap-2 min-h-[42px] sm:min-h-[46px] px-5 sm:px-6 bg-foreground text-background font-medium text-[13px] sm:text-[14px] hover:bg-white hover:text-background transition-colors shadow-[0_0_30px_rgba(255,255,255,0.15)] ${FOCUS_RING}`}
                  >
                    {stage.primaryCtaText} <span aria-hidden="true">→</span>
                  </Link>
                  <a
                    href={stage.secondaryCtaHref}
                    className={`inline-flex items-center min-h-[42px] sm:min-h-[46px] px-4 sm:px-5 border border-white/20 text-[13px] sm:text-[14px] bg-background/60 hover:border-white/40 transition-colors ${FOCUS_RING}`}
                  >
                    {stage.secondaryCtaText}
                  </a>
                </div>
              </div>
              </div>
            </div>

            <ContractAddress />
          </div>

          {/* Bottom Stage Timeline Bar */}
          <div className="relative z-30 border-t border-white/10 bg-background/90 py-3 pointer-events-auto">
            <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-2 sm:gap-4">
              <div className="hidden lg:flex items-center gap-2 text-muted mono text-[11px] tracking-[0.16em] uppercase shrink-0" aria-hidden="true">
                <span className="text-foreground font-semibold">+</span>
                <span>Scroll to travel</span>
              </div>

              <div
                role="tablist"
                aria-label="Hero stages"
                className="flex items-center gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto no-scrollbar py-0.5"
              >
                {stages.map((s, idx) => {
                  const isActive = activeStage === idx;
                  return (
                    <button
                      key={s.index}
                      ref={(el) => {
                        stageTabRefs.current[idx] = el;
                      }}
                      role="tab"
                      id={`hero-tab-${idx}`}
                      aria-selected={isActive}
                      aria-controls="hero-panel"
                      aria-label={`${idx + 1}. ${STAGE_SHORT[idx]}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => handleSelectStage(idx)}
                      onKeyDown={(e) => tabKeyDown(e, STAGE_COUNT, activeStage, selectStageFromKeyboard)}
                      className={`mono text-[10px] sm:text-[11px] tracking-[0.12em] px-2 sm:px-3 py-1 sm:py-1.5 rounded transition-colors duration-200 shrink-0 flex items-center gap-1 sm:gap-1.5 ${FOCUS_RING} ${
                        isActive
                          ? "text-foreground bg-white/10 font-medium"
                          : "text-muted hover:text-foreground hover:bg-white/5"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-amber-primary" : "bg-white/20"}`}
                      />
                      <span aria-hidden="true">
                        0{s.index}{" "}
                        <span className={isActive ? "hidden md:inline" : "hidden xl:inline"}>{STAGE_SHORT[idx]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSelectStage(activeStage - 1)}
                    disabled={activeStage === 0}
                    aria-label="Previous stage"
                    className={`mono text-[11px] px-2 py-1 border border-white/15 text-muted hover:text-foreground hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none transition-colors ${FOCUS_RING}`}
                  >
                    <span aria-hidden="true">←</span>
                  </button>
                  <span className="mono text-[10px] text-muted tracking-widest px-1" aria-hidden="true">
                    0{activeStage + 1} / 0{STAGE_COUNT}
                  </span>
                  <button
                    onClick={() => handleSelectStage(activeStage + 1)}
                    disabled={activeStage === STAGE_COUNT - 1}
                    aria-label="Next stage"
                    className={`mono text-[11px] px-2 py-1 border border-white/15 text-muted hover:text-foreground hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none transition-colors ${FOCUS_RING}`}
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
                <a
                  href="#how"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("how")
                      ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
                  }}
                  className={`hidden sm:inline-flex mono text-[10px] tracking-[0.14em] text-muted hover:text-foreground transition-colors border-l border-white/15 pl-2.5 sm:pl-3 ${FOCUS_RING}`}
                >
                  All Sections <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
