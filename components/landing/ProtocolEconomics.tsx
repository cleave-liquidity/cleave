"use client";

import { useEffect, useRef, useState } from "react";

// How protocol revenue is allocated. This states the model only: no live revenue, burn totals, addresses or
// history are shown, because none of that exists in the product yet.
const PROTOCOL_SHARE = 70;
const BURN_SHARE = 30;

/** Keep in sync with `.eco-runway` / `.eco-pin` in globals.css. */
const PIN_QUERY = "(min-width: 1024px) and (min-height: 720px)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

// Scroll progress (0…1 over the pinned runway) → two phases, one after the other, with a held beat between and after.
const PROTOCOL_PHASE = [0.06, 0.42] as const;
const BURN_PHASE = [0.52, 0.88] as const;
const AUTOPLAY_MS = 3800; // when not pinned (touch / short screens) the same sequence plays once on entry

// Embers rising off the burn segment. Fixed values (not random) so server and client render the same markup.
const EMBERS = [
  { x: 6, drift: -10, delay: 0.0, dur: 2.6, size: 3 },
  { x: 14, drift: 8, delay: 0.9, dur: 3.1, size: 2 },
  { x: 22, drift: -6, delay: 1.7, dur: 2.4, size: 3 },
  { x: 31, drift: 12, delay: 0.4, dur: 2.9, size: 2 },
  { x: 40, drift: -9, delay: 2.2, dur: 3.3, size: 3 },
  { x: 48, drift: 6, delay: 1.2, dur: 2.5, size: 2 },
  { x: 57, drift: -12, delay: 0.2, dur: 3.0, size: 3 },
  { x: 65, drift: 9, delay: 1.9, dur: 2.7, size: 2 },
  { x: 73, drift: -5, delay: 0.7, dur: 3.2, size: 3 },
  { x: 81, drift: 11, delay: 2.5, dur: 2.6, size: 2 },
  { x: 89, drift: -8, delay: 1.4, dur: 2.8, size: 3 },
  { x: 95, drift: 5, delay: 0.5, dur: 3.4, size: 2 },
] as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const phase = (p: number, [from, to]: readonly [number, number]) => clamp01((p - from) / (to - from));
const smooth = (t: number) => t * t * (3 - 2 * t);

export function ProtocolEconomics() {
  const runwayRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  useEffect(() => {
    const runway = runwayRef.current;
    if (!runway) return;

    const set = (next: number) => {
      if (Math.abs(next - progressRef.current) < 0.0004) return;
      progressRef.current = next;
      setProgress(next);
    };

    // Reduced motion: show the finished allocation, no scrubbing and no replay.
    if (window.matchMedia(REDUCED_QUERY).matches) {
      set(1);
      return;
    }

    const pinnedMq = window.matchMedia(PIN_QUERY);
    let raf = 0;
    let autoplay = 0;
    let inView = false;

    // Pinned: progress follows the scroll position through the runway (scrubbed, so it also runs backwards).
    const syncToScroll = () => {
      raf = 0;
      const travel = runway.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      set(clamp01(-runway.getBoundingClientRect().top / travel));
    };
    const schedule = () => {
      if (!pinnedMq.matches || raf) return;
      raf = requestAnimationFrame(syncToScroll);
    };

    // Not pinned: play the sequence once each time the section comes into view, and rewind when it has left.
    const play = () => {
      cancelAnimationFrame(autoplay);
      const start = performance.now() - progressRef.current * AUTOPLAY_MS;
      const tick = (now: number) => {
        const next = clamp01((now - start) / AUTOPLAY_MS);
        set(next);
        if (next < 1) autoplay = requestAnimationFrame(tick);
      };
      autoplay = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (pinnedMq.matches) return;
        inView = entry.isIntersecting;
        if (inView) play();
        else {
          cancelAnimationFrame(autoplay);
          set(0);
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(runway);

    const onModeChange = () => {
      cancelAnimationFrame(autoplay);
      if (pinnedMq.matches) schedule();
      else if (inView) play();
      else set(0);
    };
    pinnedMq.addEventListener("change", onModeChange);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule(); // e.g. reload mid-section

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(autoplay);
      observer.disconnect();
      pinnedMq.removeEventListener("change", onModeChange);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const protocolT = phase(progress, PROTOCOL_PHASE);
  const burnT = phase(progress, BURN_PHASE);
  const protocolValue = Math.round(PROTOCOL_SHARE * protocolT);
  const burnValue = Math.round(BURN_SHARE * burnT);
  const allocated = Math.round(PROTOCOL_SHARE * protocolT + BURN_SHARE * burnT);

  const protocolLit = 0.28 + 0.72 * smooth(clamp01(protocolT * 3));
  const burnLit = 0.28 + 0.72 * smooth(clamp01(burnT * 3));
  const burning = burnT > 0.02;
  const embers = burning ? (burnT < 1 ? 1 : 0.55) : 0;

  return (
    <section id="economics" ref={runwayRef} className="eco-runway relative select-none">
      <div className="eco-pin relative max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 lg:pt-40">
        <div className="eco-frame w-full">
          {/* Header */}
          <div className="pb-8 border-b border-white/10 eco-header">
            <div data-reveal className="flex flex-col gap-4 max-w-[680px]">
              <div className="mono flex items-center gap-2 text-[11px] tracking-[0.22em] text-muted uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-ice shrink-0" />
                02 — PROTOCOL ECONOMICS
              </div>
              <h2 className="eco-title m-0 text-[34px] sm:text-[46px] lg:text-[58px] leading-[1.05] font-normal tracking-[-0.035em] text-balance">
                Where protocol revenue goes.
              </h2>
              <p className="m-0 text-[15px] sm:text-[17px] leading-[1.6] text-muted font-light">
                YELTRA routes protocol revenue across two defined paths: continued protocol operations and a
                buyback-and-burn allocation.
              </p>
            </div>
          </div>

          {/* Allocation */}
          <div className="eco-body mt-10 sm:mt-14">
            <div className="mono flex items-end justify-between text-[11px] uppercase tracking-[0.18em] text-muted">
              <span>Protocol revenue</span>
              <span aria-hidden="true" className="text-muted-dark">
                <span className={allocated > 0 ? "text-foreground" : undefined}>{allocated}%</span> allocated
              </span>
            </div>
            <div className="mt-2 h-5 w-px bg-white/25" aria-hidden="true" />

            {/* 70 / 30 rail: the whole revenue stream, filled in two turns */}
            <div
              role="img"
              aria-label={`Protocol revenue allocation: ${PROTOCOL_SHARE}% Protocol, ${BURN_SHARE}% Buyback and Burn`}
              className="relative h-2.5 bg-white/[0.07]"
            >
              {/* Protocol: 0 → 70 */}
              <div
                className="absolute inset-y-0 left-0 w-[calc(70%-1.5px)] origin-left bg-ice"
                style={{ transform: `scaleX(${protocolT})` }}
              />
              <span
                className="eco-edge absolute top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-ice"
                style={{
                  left: `calc(${PROTOCOL_SHARE * protocolT}% - 1.5px)`,
                  opacity: protocolT > 0 && protocolT < 1 ? 1 : 0,
                  boxShadow: "0 0 14px 2px rgba(59,134,255,0.7)",
                }}
                aria-hidden="true"
              />

              {/* Buyback & burn: 70 → 100, heat builds as it fills */}
              <div
                className="absolute inset-y-0 left-[calc(70%+1.5px)] w-[calc(30%-1.5px)] origin-left bg-amber"
                style={{
                  transform: `scaleX(${burnT})`,
                  boxShadow: `0 0 ${Math.round(22 * burnT)}px rgba(239,95,34,${(0.55 * burnT).toFixed(2)})`,
                }}
              />
              <span
                className="eco-edge absolute top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-amber"
                style={{
                  left: `calc(${PROTOCOL_SHARE + BURN_SHARE * burnT}% - 1.5px)`,
                  opacity: burnT > 0 && burnT < 1 ? 1 : 0,
                  boxShadow: "0 0 14px 3px rgba(239,95,34,0.8)",
                }}
                aria-hidden="true"
              />

              {/* Embers lifting off the burning segment */}
              <div
                className="eco-embers pointer-events-none absolute bottom-full left-[70%] h-14 w-[30%] transition-opacity duration-500"
                style={{ opacity: embers }}
                aria-hidden="true"
              >
                {EMBERS.map((ember, index) => (
                  <span
                    key={index}
                    className="eco-ember absolute bottom-0 rounded-full bg-amber"
                    style={
                      {
                        left: `${ember.x}%`,
                        width: ember.size,
                        height: ember.size,
                        animationDelay: `${ember.delay}s`,
                        animationDuration: `${ember.dur}s`,
                        "--eco-drift": `${ember.drift}px`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            </div>
            <div className="relative mt-2 h-5 mono text-[10px] tracking-[0.14em] text-muted-dark" aria-hidden="true">
              <span className="absolute left-0 top-0">0%</span>
              <span
                className="absolute top-0 -translate-x-1/2 transition-colors duration-300"
                style={{ left: `${PROTOCOL_SHARE}%`, color: protocolT >= 1 ? "#3B86FF" : undefined }}
              >
                {PROTOCOL_SHARE}%
              </span>
              <span
                className="absolute right-0 top-0 transition-colors duration-300"
                style={{ color: burnT >= 1 ? "#EF5F22" : undefined }}
              >
                100%
              </span>
            </div>

            {/* Two regions, widths follow the rail */}
            <div className="mt-2 grid grid-cols-1 gap-8 lg:gap-[3px] lg:[grid-template-columns:70fr_30fr]">
              <div
                className="relative border-l border-ice/40 pl-5 pb-2 sm:pl-6 lg:pt-2"
                style={{ opacity: protocolLit, transform: `translateY(${(1 - protocolLit) * 10}px)` }}
              >
                <span className="absolute -left-px top-0 h-5 w-px bg-ice" aria-hidden="true" />
                <div
                  className="eco-figure mono text-[64px] sm:text-[88px] lg:text-[120px] font-medium leading-none tracking-[-0.04em] text-ice"
                  aria-hidden="true"
                >
                  {protocolValue}
                  <span className="ml-1 align-top text-[0.34em] tracking-normal">%</span>
                </div>
                <span className="sr-only">{PROTOCOL_SHARE}%</span>
                <h3 className="mono m-0 mt-5 text-[12px] font-medium uppercase tracking-[0.22em] text-ice">Protocol</h3>
                <p className="m-0 mt-3 max-w-[460px] text-[15px] leading-[1.6] text-muted font-light">
                  Supports continued protocol operations, infrastructure, integrations, and ecosystem growth.
                </p>
              </div>

              <div
                className="relative border-l border-amber/40 pl-5 pb-2 sm:pl-6 lg:pt-2"
                style={{ opacity: burnLit, transform: `translateY(${(1 - burnLit) * 10}px)` }}
              >
                <span className="absolute -left-px top-0 h-5 w-px bg-amber" aria-hidden="true" />
                <div
                  className="eco-figure mono text-[64px] sm:text-[88px] lg:text-[120px] font-medium leading-none tracking-[-0.04em] text-amber"
                  style={{ textShadow: `0 0 ${Math.round(34 * burnT)}px rgba(239,95,34,${(0.45 * burnT).toFixed(2)})` }}
                  aria-hidden="true"
                >
                  {burnValue}
                  <span className="ml-1 align-top text-[0.34em] tracking-normal">%</span>
                </div>
                <span className="sr-only">{BURN_SHARE}%</span>
                <h3 className="mono m-0 mt-5 text-[12px] font-medium uppercase tracking-[0.22em] text-amber">
                  Buyback &amp; Burn
                </h3>
                <p className="m-0 mt-3 max-w-[460px] text-[15px] leading-[1.6] text-muted font-light">
                  Allocated toward market buybacks and permanent token supply reduction.
                </p>
              </div>
            </div>
          </div>

          <p className="mono m-0 mt-8 text-[11px] tracking-[0.06em] text-muted-dark">
            Allocation model: shares of protocol revenue, not live amounts.
          </p>
        </div>
      </div>
    </section>
  );
}
