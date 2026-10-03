"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AssetIcon } from "@/components/markets/AssetIcon";
import { useFixedYieldQuote } from "@/hooks/useFixedYieldQuote";
import { useMarkets } from "@/hooks/useMarkets";
import {
  getDaysToMaturity,
  getTimelineMilestones,
  getYieldSplitSimulation,
  yieldSplitDemoMarket,
  type YieldSplitDemoMarket,
} from "@/lib/demo/yield-split-demo";
import { formatApy } from "@/lib/utils/formatters";
import { DEFAULT_TICKET, pickFeaturedMarket } from "./featuredMarket";

// ─────────────────────────────────────────────────────────────────────────────
// The Split Engine — one pinned frame, driven by scroll.
// On roomy desktops the whole frame sticks to the viewport (`.zs-runway` / `.zs-pin` in
// globals.css) and scrolling travels the timeline: the split handle moves from Today to
// Maturity, the two branches stretch and zip, and the three summary cards (Fixed, Long,
// Conservation Invariant) appear one after another underneath. Anywhere else it is a normal
// stack and the handle is dragged.
//
// Scroll is the single source of truth while pinned: dragging, keyboard and the preset
// buttons all move the page scroll, and the scroll position sets the handle.
//
// Data: market name / symbol / APY / maturity / icon come from `useMarkets()`, the PT price
// from the shared fixed quote (`useFixedYieldQuote`). The simulation itself is the untouched
// `lib/demo/yield-split-demo` logic, fed with that market instead of constants.
//
// Entrance (CSS, see `.zs-*` in globals.css): vault → line draws → split node → Fixed and
// Long branch out → labels → flow starts. Replays each time the frame comes back into view.
// ─────────────────────────────────────────────────────────────────────────────

// Timeline coordinate bounds in SVG (viewBox 1440 × 500, y from 92)
const START_X = 420;
const END_X = 1200;
const BASE_Y = 330;
const AXIS_Y = 550;

// SVG x positions are presentation geometry; milestone dates come from the market via the
// pure demo helper.
const MILESTONE_X = [420, 554, 687, 826, 964, 1089, 1200] as const;
const DAY_MS = 86_400_000;
const LINE_LEFT = -700; // lines run past the viewBox so they reach the screen edge when the diagram is letterboxed

/** Keep in sync with `.zs-runway` / `.zs-pin` in globals.css. */
const PIN_QUERY = "(min-width: 1100px) and (min-height: 760px)";
/** Share of the runway at each end where the handle rests (Today / Maturity). */
const DWELL = 0.06;
/** Timeline progress at which each summary card appears (pinned layout). */
const CARD_AT = [0, 0.3, 0.7] as const;

// Vault module: it sizes itself to its content, between these bounds (SVG units). The right edge must
// stay clear of the split node, which rests at START_X.
const VAULT_X = 36;
const VAULT_MIN_W = 262;
const VAULT_MAX_W = 340;
const VAULT_PAD = 18; // inner padding
const VAULT_TEXT_X = 72; // text starts after the icon
const NAME_FS = 19;
const NAME_FS_MIN = 14;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Entrance delay (seconds) for an element — consumed by the `.zs-*` classes. */
const at = (seconds: number) => ({ "--d": `${seconds}s` }) as React.CSSProperties;

export function YieldSplitSection() {
  // Current split position (from START_X = 420 to END_X = 1200)
  const [splitX, setSplitX] = useState<number>(START_X);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hinted, setHinted] = useState(false); // the handle pulses until it has been used once
  const [entered, setEntered] = useState<boolean | null>(null); // null = not observed yet → everything visible
  const sectionRef = useRef<HTMLElement>(null); // the runway
  const pinRef = useRef<HTMLDivElement>(null); // the pinned frame
  const nameMeasureRef = useRef<SVGTextElement>(null);
  const protoMeasureRef = useRef<SVGTextElement>(null);
  const [textW, setTextW] = useState<{ name: number; proto: number } | null>(null); // natural text widths
  const svgRef = useRef<SVGSVGElement>(null);

  // ─── Data: normalized market + shared quote through the existing hooks ───
  const { markets } = useMarkets();
  const market = useMemo(() => pickFeaturedMarket(markets), [markets]);
  const { quote: fixedQuote } = useFixedYieldQuote(market?.id ?? "", DEFAULT_TICKET);
  const ptReady = Boolean(market && fixedQuote);

  // The demo logic is parameterised by market. Feed it the live one; only the
  // simulation parameters (offsets, thresholds, unit amount) stay with the demo.
  const splitMarket = useMemo<YieldSplitDemoMarket>(() => {
    if (!market) return yieldSplitDemoMarket;
    const maturity = Date.parse(market.maturityDate);
    const demoSpan = getDaysToMaturity(yieldSplitDemoMarket.referenceDate, yieldSplitDemoMarket.maturityDate);
    return {
      ...yieldSplitDemoMarket,
      symbol: market.symbol,
      name: market.assetMetadata?.name ?? market.name,
      impliedApy: market.impliedApy,
      maturityDate: Number.isFinite(maturity) ? new Date(maturity).toISOString() : yieldSplitDemoMarket.maturityDate,
      referenceDate: Number.isFinite(maturity)
        ? new Date(maturity - market.daysRemaining * DAY_MS).toISOString()
        : yieldSplitDemoMarket.referenceDate,
      // Keep the same shape of timeline whatever the market's length is.
      timelineDayOffsets: yieldSplitDemoMarket.timelineDayOffsets.map((o) => Math.round((o / demoSpan) * market.daysRemaining)),
      initialPtPrice: fixedQuote?.ptPrice ?? yieldSplitDemoMarket.initialPtPrice,
    };
  }, [market, fixedQuote]);

  const milestones = useMemo(() => {
    const list = getTimelineMilestones(splitMarket).map((m, i) => ({ ...m, x: MILESTONE_X[i] }));
    // Short markets repeat the same month on every tick; label those ticks with the day instead.
    const months = list.slice(1, -1).map((m) => m.label);
    if (new Set(months).size === months.length) return list;
    return list.map((m, i) => (i === 0 || i === list.length - 1 ? m : { ...m, label: m.date.slice(0, 6).toUpperCase() }));
  }, [splitMarket]);
  const maturityMilestone = milestones[milestones.length - 1];

  // Normalized progress: 0.0 = Today (fully split) -> 1.0 = Maturity (fully zipped / unified)
  const progress = Math.max(0, Math.min(1, (splitX - START_X) / (END_X - START_X)));

  const {
    currentDate: currentDateStr,
    daysLeft,
    currentPtPrice,
    yieldStreamed,
    yieldPaidPercentage,
    leverage,
    isFullZipped,
  } = useMemo(() => getYieldSplitSimulation(splitMarket, progress), [splitMarket, progress]);

  const symbol = market?.symbol ?? "";
  const assetName = market?.assetMetadata?.name ?? market?.name ?? "Lending vault";
  const protocol = market?.protocolMetadata?.name ?? market?.sourceProtocol;
  const dash = "—";
  // Prices are in the market's own asset (USDG, NVDA, …), not dollars: say which.
  const amt = (v: number) => `${v.toFixed(3)} ${symbol}`.trim();

  // ─── Vault module sizing: measure the real text, then fit the card to it ──
  const vaultLine = `LENDING VAULT${protocol ? ` · ${protocol.toUpperCase()}` : ""}`;
  useLayoutEffect(() => {
    const measure = () => {
      const name = nameMeasureRef.current?.getComputedTextLength();
      const proto = protoMeasureRef.current?.getComputedTextLength();
      if (name === undefined || proto === undefined) return;
      setTextW((prev) =>
        prev && Math.abs(prev.name - name) < 0.5 && Math.abs(prev.proto - proto) < 0.5 ? prev : { name, proto },
      );
    };
    measure();
    // The mono / Geist faces load after first paint and change the widths.
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
  }, [assetName, vaultLine]);

  const vault = useMemo(() => {
    const inner = VAULT_PAD + (VAULT_TEXT_X - VAULT_PAD) + VAULT_PAD; // left pad + icon column + right pad
    const natural = textW ? Math.max(textW.name, textW.proto) + inner : VAULT_MIN_W;
    const w = clamp(Math.ceil(natural), VAULT_MIN_W, VAULT_MAX_W);
    const avail = w - VAULT_TEXT_X - VAULT_PAD;
    let fs = NAME_FS;
    let label = assetName;
    if (textW && textW.name > avail) {
      fs = Math.max(NAME_FS_MIN, (NAME_FS * avail) / textW.name);
      const lenAtMin = (textW.name * fs) / NAME_FS;
      if (lenAtMin > avail) {
        // Even the smallest size does not fit: cut the name and say so.
        const keep = Math.max(4, Math.floor(assetName.length * (avail / lenAtMin)) - 1);
        label = `${assetName.slice(0, keep).trimEnd()}…`;
      }
    }
    return { w, fs, label };
  }, [textW, assetName]);

  // ─── Entrance: play when the frame is in view, reset when it has left ────
  useEffect(() => {
    const el = pinRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.3) setEntered(true);
        else if (!entry.isIntersecting) setEntered(false);
      },
      { threshold: [0, 0.3] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ─── Scroll → handle (pinned desktop) ───────────────────────────────────
  useEffect(() => {
    let raf = 0;
    const sync = () => {
      raf = 0;
      const run = sectionRef.current;
      if (!run || !window.matchMedia(PIN_QUERY).matches) return;
      const travel = run.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      const p = clamp(-run.getBoundingClientRect().top / travel, 0, 1);
      const t = clamp((p - DWELL) / (1 - 2 * DWELL), 0, 1);
      setSplitX(START_X + (END_X - START_X) * t);
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

  /**
   * Move the handle. Pinned: the page scrolls to that point of the runway (and the scroll
   * handler sets the handle, so scroll stays the one source of truth). Otherwise: set it directly.
   */
  const moveTo = useCallback((x: number, smooth = false) => {
    const next = clamp(x, START_X, END_X);
    const run = sectionRef.current;
    if (run && window.matchMedia(PIN_QUERY).matches) {
      const t = (next - START_X) / (END_X - START_X);
      const top = run.getBoundingClientRect().top + window.scrollY;
      const travel = run.offsetHeight - window.innerHeight;
      if (!smooth) setSplitX(next);
      window.scrollTo({
        top: Math.round(top + (DWELL + t * (1 - 2 * DWELL)) * travel),
        behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto",
      });
      return;
    }
    setSplitX(next);
  }, []);

  // Convert pointer position to SVG user space (exact whatever the scaling).
  const updateSplitFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      moveTo(pt.matrixTransform(ctm.inverse()).x);
    },
    [moveTo],
  );

  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setHinted(true);
    updateSplitFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!isDragging) return;
    updateSplitFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // The handle is a slider: ←/→ move it by 5 %, Home / End jump to the ends.
  const handleKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
    const step = (END_X - START_X) * 0.05;
    let next = splitX;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next += step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next -= step;
    else if (e.key === "Home") next = START_X;
    else if (e.key === "End") next = END_X;
    else return;
    e.preventDefault();
    setHinted(true);
    moveTo(next);
  };

  // Generate dynamic smooth paths based on splitX
  const { pathUnified, pathFixed, pathLong, fixedEndPt, longEndPt } = useMemo(() => {
    // 1. Unified line: from off the left edge to x=splitX
    const unified = `M ${LINE_LEFT} ${BASE_Y} L ${splitX} ${BASE_Y}`;

    // If fully zipped (at or very near maturity), lines merge completely into straight line
    if (splitX >= END_X - 6) {
      return {
        pathUnified: `M ${LINE_LEFT} ${BASE_Y} L ${END_X} ${BASE_Y}`,
        pathFixed: `M ${END_X} ${BASE_Y} L ${END_X} ${BASE_Y}`,
        pathLong: `M ${END_X} ${BASE_Y} L ${END_X} ${BASE_Y}`,
        fixedEndPt: { x: END_X, y: BASE_Y },
        longEndPt: { x: END_X, y: BASE_Y },
      };
    }

    // 2. Fixed Yield path: ramps up from (splitX, 330) toward y=232 -> y=214
    const fixedPts: string[] = [`M ${splitX} ${BASE_Y}`];
    const longPts: string[] = [`M ${splitX} ${BASE_Y}`];

    const step = 14;
    for (let x = splitX + step; x <= END_X; x += step) {
      const normTotal = (x - START_X) / (END_X - START_X);
      const targetFixedY = 232 - normTotal * 18;

      // Smooth ease ramp from splitX
      const rampFixed = Math.min(1, (x - splitX) / 85);
      const smoothFixed = rampFixed * rampFixed * (3 - 2 * rampFixed);
      const yFixed = BASE_Y + (targetFixedY - BASE_Y) * smoothFixed;
      fixedPts.push(`L ${x.toFixed(1)} ${yFixed.toFixed(1)}`);

      // Long yield wave
      const wave = Math.sin((x - START_X) / 38) * 26 + Math.cos((x - START_X) / 72) * 12;
      const targetLongY = 430 + wave;
      const rampLong = Math.min(1, (x - splitX) / 95);
      const smoothLong = rampLong * rampLong * (3 - 2 * rampLong);
      const yLong = BASE_Y + (targetLongY - BASE_Y) * smoothLong;
      longPts.push(`L ${x.toFixed(1)} ${yLong.toFixed(1)}`);
    }

    // Ensure ending exactly at END_X
    const finalNorm = 1;
    const finalFixedY = 232 - finalNorm * 18;
    fixedPts.push(`L ${END_X} ${finalFixedY}`);

    const finalLongWave = Math.sin((END_X - START_X) / 38) * 26 + Math.cos((END_X - START_X) / 72) * 12;
    const finalLongY = 430 + finalLongWave;
    longPts.push(`L ${END_X} ${finalLongY}`);

    return {
      pathUnified: unified,
      pathFixed: fixedPts.join(" "),
      pathLong: longPts.join(" "),
      fixedEndPt: { x: END_X, y: finalFixedY },
      longEndPt: { x: END_X, y: finalLongY },
    };
  }, [splitX]);

  // Area between each branch and the parity line: the "locked" side above, the "floating" side below.
  const areaFixed = `${pathFixed} L ${END_X} ${BASE_Y} Z`;
  const areaLong = `${pathLong} L ${END_X} ${BASE_Y} Z`;

  const labelX = Math.max(splitX + 60, 560);
  const chipX = Math.min(1350, Math.max(90, splitX));
  const branchOpacity = isFullZipped ? 0 : 1;
  const labelOpacity = progress > 0.85 ? 0.3 : 1;

  const cardOn = (i: number) => progress >= CARD_AT[i] - 1e-6;

  return (
    <section
      id="how"
      ref={sectionRef}
      data-zs={entered === null ? undefined : String(entered)}
      className="zs-runway relative select-none overflow-x-clip"
    >
      {/* Top divider: a hairline with a soft light that falls off smoothly on every side (no box). */}
      <div id="trade-yield" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[260px]"
        style={{
          background:
            "radial-gradient(48% 100% at 50% 0%, rgba(59,134,255,0.16) 0%, rgba(59,134,255,0.07) 38%, rgba(59,134,255,0.02) 62%, transparent 82%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-px w-[min(46%,640px)] -translate-x-1/2"
        style={{ background: "linear-gradient(90deg, transparent, rgba(214,230,252,0.75), transparent)" }}
      />

      <div
        ref={pinRef}
        className="zs-pin relative pb-3 pt-14 lg:pt-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(59,134,255,0.05) 0%, transparent 70%)",
        }}
      >
      {/* Section Header */}
      <div className="relative mx-auto grid w-full max-w-[1240px] grid-cols-1 items-end gap-5 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10 lg:px-10">
        <div data-reveal className="flex flex-col gap-3 sm:gap-4">
          <div className="mono flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ice" />
            01 — THE SPLIT ENGINE
          </div>
          <h2 className="m-0 text-[34px] font-normal leading-[1.05] tracking-[-0.035em] text-balance sm:text-[46px] lg:text-[50px]">
            One asset.
            <br />
            <span className="text-foreground">Two ways to own its yield.</span>
          </h2>
        </div>

        <div data-reveal="1" className="flex flex-col gap-3">
          <p className="m-0 text-[15px] font-light leading-[1.6] text-muted sm:text-[16px]">
            {symbol ? `${symbol} in a lending vault` : "A yield-bearing asset in a lending vault"} earns a rate that changes daily. We split that
            position: one side holds steady to maturity, the other rides the rate.
          </p>

          {/* Interactive Zipper Control & Preset buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono mr-1 text-[11px] uppercase tracking-[0.14em] text-muted-dark">Timeline:</span>
            <button
              type="button"
              onClick={() => moveTo(START_X, true)}
              className={`mono border px-2.5 py-1 text-[10px] tracking-[0.1em] transition-all ${
                progress <= 0.05
                  ? "border-ice bg-ice/15 font-medium text-ice"
                  : "border-white/10 text-muted hover:border-white/30 hover:text-foreground"
              }`}
            >
              Today (Fully Split)
            </button>
            <button
              type="button"
              onClick={() => moveTo(START_X + (END_X - START_X) * 0.5, true)}
              className={`mono border px-2.5 py-1 text-[10px] tracking-[0.1em] transition-all ${
                progress > 0.4 && progress < 0.6
                  ? "border-ice bg-ice/15 font-medium text-ice"
                  : "border-white/10 text-muted hover:border-white/30 hover:text-foreground"
              }`}
            >
              Mid-term (50%)
            </button>
            <button
              type="button"
              onClick={() => moveTo(END_X, true)}
              className={`mono border px-2.5 py-1 text-[10px] tracking-[0.1em] transition-all ${
                isFullZipped
                  ? "border-amber bg-amber/15 font-medium text-amber"
                  : "border-white/10 text-muted hover:border-white/30 hover:text-foreground"
              }`}
            >
              Maturity (Zipped / Flat)
            </button>
          </div>
        </div>
      </div>

      {/* Live Simulation Stats Bar */}
      <div data-reveal="2" className="relative mx-auto mt-4 flex w-full max-w-[1240px] flex-wrap items-center justify-end gap-4 px-4 sm:px-6 lg:px-10">
        <div className="mono flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tracking-[0.12em] text-muted">
          <div>
            DATE: <span className="font-medium text-foreground">{currentDateStr}</span>
          </div>
          <div>
            REMAINING: <span className="font-medium text-ice">{daysLeft}d</span>
          </div>
          <div>
            PT VALUE: <span className="font-medium text-ice">{ptReady ? amt(currentPtPrice) : dash}</span>
          </div>
          <div>
            STREAMED: <span className="font-medium text-amber">{ptReady ? amt(yieldStreamed) : dash}</span>
          </div>
        </div>
      </div>

      {/* ─── YIELD SPLIT INTERACTIVE SVG DIAGRAM ─── */}
      <div className="zs-stage no-scrollbar relative mt-1 flex items-center">
        <div className="zs-stage-inner flex-1">
          <svg
            ref={svgRef}
            viewBox="0 92 1440 500"
            className="zs-svg cursor-default"
            role="group"
            aria-label={`Interactive yield split diagram: one ${symbol || "asset"} position splits into Fixed and Long yield and reunites at maturity`}
          >
            <defs>
              {/* Radial gradient for glowing slider handle */}
              <radialGradient id="handleGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(59,134,255,0.5)" />
                <stop offset="60%" stopColor="rgba(59,134,255,0.15)" />
                <stop offset="100%" stopColor="rgba(59,134,255,0)" />
              </radialGradient>
              <radialGradient id="handleGlowAmber" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(239,95,34,0.6)" />
                <stop offset="60%" stopColor="rgba(239,95,34,0.15)" />
                <stop offset="100%" stopColor="rgba(239,95,34,0)" />
              </radialGradient>
              {/* Vertical guide through the handle */}
              <linearGradient id="splitLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(59,134,255,0)" />
                <stop offset="30%" stopColor="rgba(59,134,255,0.25)" />
                <stop offset="50%" stopColor="rgba(236,237,234,0.6)" />
                <stop offset="70%" stopColor="rgba(239,95,34,0.25)" />
                <stop offset="100%" stopColor="rgba(239,95,34,0)" />
              </linearGradient>
              {/* The asset line fades in from the left edge — it is entering the scene */}
              <linearGradient id="unifiedGrad" gradientUnits="userSpaceOnUse" x1="-300" y1="0" x2="360" y2="0">
                <stop offset="0%" stopColor="rgba(236,237,234,0.1)" />
                <stop offset="100%" stopColor="rgba(236,237,234,1)" />
              </linearGradient>
              <linearGradient id="areaFixedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(59,134,255,0.2)" />
                <stop offset="100%" stopColor="rgba(59,134,255,0.01)" />
              </linearGradient>
              <linearGradient id="areaLongGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="rgba(239,95,34,0.2)" />
                <stop offset="100%" stopColor="rgba(239,95,34,0.01)" />
              </linearGradient>
              <linearGradient id="vaultEdge" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(236,237,234,0)" />
                <stop offset="50%" stopColor="rgba(236,237,234,0.55)" />
                <stop offset="100%" stopColor="rgba(236,237,234,0)" />
              </linearGradient>
            </defs>

            {/* Vertical milestone grid, axis rule and ticks */}
            <g className="zs-fade" style={at(0.1)}>
              <g stroke="rgba(236,237,234,0.06)" strokeWidth="1">
                {milestones.slice(0, -1).map((m, i) => (
                  <path key={`${m.label}-${i}`} d={`M ${m.x} 120 V ${AXIS_Y}`} />
                ))}
              </g>
              <path d={`M ${LINE_LEFT} ${AXIS_Y} H ${1440 - LINE_LEFT}`} stroke="rgba(236,237,234,0.14)" strokeWidth="1" />
              <g stroke="rgba(236,237,234,0.3)" strokeWidth="1">
                {milestones.slice(0, -1).map((m, i) => (
                  <path key={`${m.label}-${i}`} d={`M ${m.x} ${AXIS_Y} v 6`} />
                ))}
              </g>
            </g>

            {/* Elapsed time along the axis: lights up as the split moves toward maturity */}
            <path
              d={`M ${START_X} ${AXIS_Y} H ${splitX}`}
              stroke="rgba(59,134,255,0.75)"
              strokeWidth="2"
              strokeLinecap="round"
              className="zs-fade"
              style={at(0.5)}
            />

            {/* Month labels along bottom */}
            <g className="mono zs-fade" fontSize="11" letterSpacing="0.12em" style={at(0.25)}>
              {milestones.slice(0, -1).map((m, i) => (
                <text
                  key={`${m.label}-${i}`}
                  x={m.x}
                  y="574"
                  textAnchor="middle"
                  fill={splitX >= m.x ? "#ECEDEA" : "#6F7471"}
                  fontWeight={splitX >= m.x ? "500" : "400"}
                >
                  {m.label}
                </text>
              ))}
            </g>

            {/* Maturity line at x=1200 */}
            <path
              d={`M ${END_X} 112 V ${AXIS_Y}`}
              stroke={isFullZipped ? "#EF5F22" : "rgba(236,237,234,0.45)"}
              strokeWidth={isFullZipped ? "1.8" : "1"}
              strokeDasharray={isFullZipped ? "none" : "3 6"}
              className="zs-fade"
              style={at(0.9)}
            />
            <g className="mono zs-fade" fontSize="12" letterSpacing="0.14em" style={at(2.1)}>
              <text x={END_X + 16} y="146" fill={isFullZipped ? "#EF5F22" : "#ECEDEA"}>
                MATURITY
              </text>
              <text x={END_X + 16} y="166" fill="#8E9390">
                {maturityMilestone.date.toUpperCase()}
              </text>
            </g>

            {/* Parity line: both branches start from it and are pulled back to it at maturity */}
            <path
              d={`M ${splitX} ${BASE_Y} H ${END_X}`}
              stroke="rgba(236,237,234,0.16)"
              strokeWidth="1"
              strokeDasharray="2 6"
              className="zs-fade"
              style={at(1.5)}
            />

            {/* Areas: the locked side above parity, the floating side below it */}
            <g className="zs-fade" style={at(2.1)}>
              <g style={{ opacity: branchOpacity, transition: "opacity 0.35s ease" }}>
                <path d={areaFixed} fill="url(#areaFixedGrad)" />
                <path d={areaLong} fill="url(#areaLongGrad)" />
              </g>
            </g>

            {/* 1. Unified collateral line (before splitX): soft halo, then the line itself */}
            <path d={pathUnified} stroke="rgba(236,237,234,0.07)" strokeWidth="10" fill="none" strokeLinecap="round" className="zs-fade" style={at(0.6)} />
            <path
              d={pathUnified}
              pathLength={1}
              stroke="url(#unifiedGrad)"
              strokeWidth={isFullZipped ? "2.6" : "2.2"}
              fill="none"
              strokeLinecap="round"
              className="zs-draw"
              style={at(0.6)}
            />
            {/* Flow dots on unified line */}
            <path d={pathUnified} stroke="#ECEDEA" strokeWidth="3.5" fill="none" strokeLinecap="round" className="zs-flow slow" style={at(2.4)} />

            {/* Vault module: where the asset sits before the split. Its width follows its content. */}
            <g transform={`translate(${VAULT_X} ${BASE_Y - 62})`}>
              <g className="zs-slide" style={at(0.2)}>
                <rect width={vault.w} height="124" rx="14" fill="#07090D" stroke="rgba(236,237,234,0.16)" />
                <path d={`M ${VAULT_PAD} 0.5 H ${vault.w - VAULT_PAD}`} stroke="url(#vaultEdge)" strokeWidth="1" />
                <foreignObject x={VAULT_PAD} y="16" width="40" height="40">
                  <AssetIcon
                    symbol={market?.assetMetadata?.symbol ?? (symbol || "—")}
                    name={assetName}
                    iconUrl={market?.assetMetadata?.iconUrl}
                    size="md"
                  />
                </foreignObject>
                <text className="mono" x={VAULT_TEXT_X} y="29" fontSize="10" letterSpacing="0.14em" fill="#8E9390">
                  {vaultLine}
                </text>
                <text x={VAULT_TEXT_X} y="52" fontSize={vault.fs} fill="#ECEDEA" letterSpacing="-0.01em">
                  {vault.label}
                </text>
                <path d={`M ${VAULT_PAD} 72 H ${vault.w - VAULT_PAD}`} stroke="rgba(236,237,234,0.1)" />
                <g className="mono" fontSize="11" letterSpacing="0.1em">
                  <text x={VAULT_PAD} y="94" fill="#8E9390">
                    UNDERLYING APY
                  </text>
                  <text x={vault.w - VAULT_PAD} y="94" textAnchor="end" fill="#3B86FF">
                    {market ? formatApy(market.underlyingApy) : dash}
                  </text>
                  <text x={VAULT_PAD} y="112" fill="#8E9390">
                    COLLATERAL
                  </text>
                  <text x={vault.w - VAULT_PAD} y="112" textAnchor="end" fill="#ECEDEA">
                    {splitMarket.underlyingAmount.toFixed(2)} {symbol}
                  </text>
                </g>
              </g>
            </g>

            {/* Hidden twins used only to measure the natural text widths above */}
            <g visibility="hidden" aria-hidden="true">
              <text ref={protoMeasureRef} className="mono" fontSize="10" letterSpacing="0.14em">
                {vaultLine}
              </text>
              <text ref={nameMeasureRef} fontSize={NAME_FS} letterSpacing="-0.01em">
                {assetName}
              </text>
            </g>

            {/* 2. Fixed Yield branch (ice): steady. Always mounted so the entrance never replays on re-split. */}
            <g style={{ opacity: branchOpacity, transition: "opacity 0.35s ease" }}>
              <path d={pathFixed} stroke="rgba(59,134,255,0.07)" strokeWidth="11" fill="none" strokeLinecap="round" className="zs-fade" style={at(1.7)} />
              <path d={pathFixed} stroke="rgba(59,134,255,0.16)" strokeWidth="5" fill="none" strokeLinecap="round" className="zs-fade" style={at(1.7)} />
              <path d={pathFixed} pathLength={1} stroke="#3B86FF" strokeWidth="2.2" fill="none" strokeLinecap="round" className="zs-draw" style={at(1.7)} />
              <path d={pathFixed} stroke="#DDE8F8" strokeWidth="3.5" fill="none" strokeLinecap="round" className="zs-flow" style={at(2.6)} />
              <g className="mono zs-fade" fontSize="11" letterSpacing="0.12em" style={at(2.4)}>
                <g opacity={labelOpacity}>
                  <text x={labelX} y="196" fill="#3B86FF">
                    FIXED YIELD · APY {formatApy(splitMarket.impliedApy)}
                  </text>
                  <text x={labelX} y="214" fill="#8E9390" fontSize="10">
                    {ptReady ? `PT ${amt(currentPtPrice)} → 1.00 ${symbol}` : `PT → 1.00 ${symbol}`}
                  </text>
                </g>
              </g>
              <g className="zs-pop" style={{ ...at(2.9), transformBox: "fill-box", transformOrigin: "center" }}>
                <circle cx={END_X} cy={fixedEndPt.y} r="9" fill="rgba(59,134,255,0.18)" />
                <circle cx={END_X} cy={fixedEndPt.y} r="5" fill="#3B86FF" />
              </g>
              <g className="mono zs-fade" fontSize="11" letterSpacing="0.12em" style={at(3)}>
                <rect x={END_X + 16} y={fixedEndPt.y - 22} width="124" height="40" rx="8" fill="rgba(59,134,255,0.07)" stroke="rgba(59,134,255,0.3)" />
                <text x={END_X + 28} y={fixedEndPt.y - 5} fill="#3B86FF">
                  PAYS 1 : 1
                </text>
                <text x={END_X + 28} y={fixedEndPt.y + 11} fill="#3B86FF" opacity="0.8">
                  IN {symbol}
                </text>
              </g>
            </g>

            {/* 3. Long Yield branch (amber): alive */}
            <g style={{ opacity: branchOpacity, transition: "opacity 0.35s ease" }}>
              <path d={pathLong} stroke="rgba(239,95,34,0.07)" strokeWidth="11" fill="none" strokeLinecap="round" className="zs-fade" style={at(1.7)} />
              <path d={pathLong} stroke="rgba(239,95,34,0.16)" strokeWidth="5" fill="none" strokeLinecap="round" className="zs-fade" style={at(1.7)} />
              <path d={pathLong} pathLength={1} stroke="#EF5F22" strokeWidth="2.2" fill="none" strokeLinecap="round" className="zs-draw zs-draw-slow" style={at(1.7)} />
              <path d={pathLong} stroke="#FFE9D2" strokeWidth="3.5" fill="none" strokeLinecap="round" className="zs-flow" style={at(2.8)} />
              <g className="mono zs-fade" fontSize="11" letterSpacing="0.12em" style={at(2.6)}>
                <g opacity={labelOpacity}>
                  <text x={labelX} y="500" fill="#EF5F22">
                    LONG YIELD · FLOATS WITH THE RATE
                  </text>
                  <text x={labelX} y="518" fill="#8E9390" fontSize="10">
                    {ptReady ? `+${yieldPaidPercentage.toFixed(0)}% STREAMED · ~${leverage.toFixed(1)}x EXPOSURE` : `+${yieldPaidPercentage.toFixed(0)}% STREAMED`}
                  </text>
                </g>
              </g>
              <g className="zs-pop" style={{ ...at(3.1), transformBox: "fill-box", transformOrigin: "center" }}>
                <circle cx={END_X} cy={longEndPt.y} r="9" fill="rgba(239,95,34,0.14)" />
                <circle cx={END_X} cy={longEndPt.y} r="5" fill="#07090D" stroke="#EF5F22" strokeWidth="1.8" />
              </g>
              <g className="mono zs-fade" fontSize="11" letterSpacing="0.12em" style={at(3.2)}>
                <rect x={END_X + 16} y={longEndPt.y - 20} width="150" height="40" rx="8" fill="rgba(239,95,34,0.07)" stroke="rgba(239,95,34,0.3)" />
                <text x={END_X + 28} y={longEndPt.y - 3} fill="#EF5F22">
                  YIELD PAID OUT
                </text>
                <text x={END_X + 28} y={longEndPt.y + 13} fill="#EF5F22" opacity="0.8">
                  ENDS AT ZERO
                </text>
              </g>
            </g>

            {/* Reunited at Maturity Indicator when fully zipped */}
            {isFullZipped && (
              <g className="mono zs-reunited" fontSize="12" letterSpacing="0.14em">
                <circle cx={END_X} cy={BASE_Y} r="7" fill="#34D399" />
                <circle cx={END_X} cy={BASE_Y} r="18" fill="none" stroke="#34D399" strokeWidth="1" strokeDasharray="3 3" />
                {/* Left of the node: the right-hand side has no room for the full sentence. */}
                <text x={END_X - 32} y={BASE_Y - 16} textAnchor="end" fill="#34D399" fontWeight="600">
                  REUNITED AT MATURITY
                </text>
                <text x={END_X - 32} y={BASE_Y + 28} textAnchor="end" fill="#ECEDEA">
                  1 PT + 1 YT = {splitMarket.underlyingAmount.toFixed(0)} {symbol} REDEEMED
                </text>
              </g>
            )}

            {/* 4. DRAGGABLE ZIPPER HANDLE (At splitX) */}
            <g
              transform={`translate(${splitX} 0)`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="slider"
              aria-label="Split position along the timeline"
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-valuetext={`${currentDateStr}, ${daysLeft} days remaining`}
              className="zs-handle group pointer-events-auto cursor-ew-resize select-none"
            >
              {/* Invisible wide hit area for easy drag */}
              <rect x="-30" y="100" width="60" height={AXIS_Y - 100} fill="transparent" />

              {/* Vertical highlight line through handle */}
              <line
                x1="0"
                y1="124"
                x2="0"
                y2={AXIS_Y}
                stroke="url(#splitLineGrad)"
                strokeWidth={isDragging ? "2" : "1.2"}
                strokeDasharray="2 4"
                className="zs-fade"
                style={at(1.3)}
              />

              {/* Date chip that rides the guide */}
              <g className="mono zs-fade" fontSize="10.5" letterSpacing="0.1em" style={at(1.3)}>
                <g transform={`translate(${chipX - splitX} 0)`}>
                  <rect x="-102" y="96" width="204" height="22" rx="11" fill="#0A0C10" stroke="rgba(236,237,234,0.22)" />
                  <text x="0" y="111" textAnchor="middle" fill="#ECEDEA">
                    {currentDateStr.toUpperCase()} · {daysLeft}D LEFT
                  </text>
                </g>
              </g>

              <g className="zs-pop" style={{ ...at(1.3), transformBox: "fill-box", transformOrigin: "center" }}>
                {/* Pulse until the handle has been used once: the diagram is meant to be played with */}
                {!hinted && !isFullZipped && (
                  <circle cx="0" cy={BASE_Y} r="18" fill="none" stroke="rgba(59,134,255,0.6)" strokeWidth="1.2" className="zs-ping" />
                )}

                {/* Ambient handle glow */}
                <circle
                  cx="0"
                  cy={BASE_Y}
                  r={isDragging ? "40" : "32"}
                  fill={isFullZipped ? "url(#handleGlowAmber)" : "url(#handleGlow)"}
                  className="transition-all duration-200"
                />

                {/* Outer reticle circle */}
                <circle
                  cx="0"
                  cy={BASE_Y}
                  r={isDragging ? "21" : "17"}
                  fill="#0A0C10"
                  stroke={isDragging ? "#FFFFFF" : isFullZipped ? "#EF5F22" : "#3B86FF"}
                  strokeWidth="1.6"
                  className="transition-all duration-150"
                />

                {/* Rotating zipper notches */}
                <circle cx="0" cy={BASE_Y} r="11.5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 3" />

                {/* Center core dot */}
                <circle cx="0" cy={BASE_Y} r="5" fill={isFullZipped ? "#EF5F22" : "#ECEDEA"} />

                {/* Drag affordance: it moves along the timeline */}
                <g fill="rgba(236,237,234,0.55)" opacity={isDragging ? 0 : 1} className="transition-opacity duration-150">
                  {splitX > START_X + 4 && <path d={`M -29 ${BASE_Y} l 6 -4.5 v 9 z`} />}
                  {splitX < END_X - 4 && <path d={`M 29 ${BASE_Y} l -6 -4.5 v 9 z`} />}
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>

      {/* ─── Summary cards: appear one after another as the timeline travels (pinned) ─── */}
      <div className="relative mx-auto mt-2 grid w-full max-w-[1240px] grid-cols-1 border-t border-white/10 px-4 sm:px-6 md:grid-cols-3 lg:px-10">
        <div
          data-on={cardOn(0)}
          className="zs-card flex flex-col gap-1.5 border-b border-white/10 py-4 md:border-b-0 md:border-r md:py-3 md:pr-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-ice" />
              <span className="text-[16px] font-medium text-ice">Fixed Yield (PT)</span>
            </div>
            <span className="mono text-[13px] text-ice">{ptReady ? amt(currentPtPrice) : dash}</span>
          </div>
          <span className="text-[13px] font-light leading-[1.5] text-muted">
            Worth exactly {splitMarket.underlyingAmount.toFixed(0)} {symbol} at maturity, bought below 1 today. The gap is your locked
            return, with zero liquidation.
          </span>
          <div className="mono flex justify-between text-[10px] tracking-[0.1em] text-muted-dark">
            <span>APY: {formatApy(splitMarket.impliedApy)} LOCKED</span>
            <span>
              MATURES: {splitMarket.underlyingAmount.toFixed(2)} {symbol}
            </span>
          </div>
        </div>

        <div
          data-on={cardOn(1)}
          className="zs-card flex flex-col gap-1.5 border-b border-white/10 py-4 md:border-b-0 md:border-r md:px-8 md:py-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber" />
              <span className="text-[16px] font-medium text-amber">Long Yield (YT)</span>
            </div>
            <span className="mono text-[13px] text-amber">+{yieldPaidPercentage.toFixed(0)}% paid</span>
          </div>
          <span className="text-[13px] font-light leading-[1.5] text-muted">
            Collects streaming yield until maturity, then ends at zero. You win if the variable rate stays above break-even.
          </span>
          <div className="mono flex justify-between text-[10px] tracking-[0.1em] text-muted-dark">
            <span>CLAIMED: {ptReady ? amt(yieldStreamed) : dash}</span>
            <span>LEVERAGE: {ptReady ? `~${leverage.toFixed(1)}x` : dash}</span>
          </div>
        </div>

        <div data-on={cardOn(2)} className="zs-card flex flex-col gap-1.5 py-4 md:py-3 md:pl-8">
          <span className="mono text-[11px] uppercase tracking-[0.14em] text-muted-dark">Conservation Invariant</span>
          <span className="mono text-[19px] leading-[1.3] text-foreground">
            <span className="text-ice">1 PT</span> + <span className="text-amber">1 YT</span> = {splitMarket.underlyingAmount.toFixed(0)} {symbol} Vault
          </span>
          <span className="mono text-[10px] tracking-[0.08em] text-muted-dark">
            {isFullZipped ? "MATURITY REACHED · 100% REDEEMABLE" : "ACTIVE SPLIT · NO PROTOCOL DEBT"}
          </span>
        </div>
      </div>
      </div>
    </section>
  );
}
