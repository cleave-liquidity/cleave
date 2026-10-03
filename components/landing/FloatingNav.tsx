"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buildLensMapUrl, supportsBackdropLens } from "./liquidGlass";

const HERO_ID = "top";
const LENS_FILTER_ID = "cleave-liquid-lens";

const LINKS = [
  { href: "/markets", label: "Markets" },
  { href: "/trade", label: "Trade Yield" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/docs", label: "Docs" },
  { href: "/contracts", label: "Contracts" },
] as const;

// Different shifts per colour channel split the bent image into the rainbow fringe real glass has at its rim.
const DISPERSION = [
  { name: "red", scale: 34, matrix: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" },
  { name: "green", scale: 46, matrix: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" },
  { name: "blue", scale: 58, matrix: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" },
] as const;

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice";

const subscribeNothing = () => () => {};
const readLensSupport = () => supportsBackdropLens(navigator.userAgent);

type Chip = { left: number; width: number; on: boolean };

/**
 * Landing-only liquid glass navbar. The hero ships its own navbar inside the pinned scene and that one
 * scrolls away with it; this one takes over once the hero (pinned runway included) has fully left the
 * viewport, so it never competes with the hero's scroll-driven stages.
 */
export function FloatingNav() {
  const [visible, setVisible] = useState(false);
  const [chip, setChip] = useState<Chip>({ left: 0, width: 0, on: false });
  const [lensMap, setLensMap] = useState<{ url: string; width: number; height: number } | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const canRefract = useSyncExternalStore(subscribeNothing, readLensSupport, () => false);

  useEffect(() => {
    const hero = document.getElementById(HERO_ID);

    if (!hero || typeof IntersectionObserver === "undefined") {
      const onScroll = () => setVisible(window.scrollY > window.innerHeight);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    // The hero is the first block of the page, so "not intersecting" can only mean it is above the
    // viewport. The callback also fires once on mount, which keeps reloads and #anchors correct.
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // The refraction map has to match the pill's pixel size, so it is rebuilt whenever the pill resizes.
  useEffect(() => {
    const panel = panelRef.current;
    if (!canRefract || !panel || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = Math.round(panel.offsetWidth);
        const height = Math.round(panel.offsetHeight);
        const url = buildLensMapUrl(width, height);
        setLensMap(url ? { url, width, height } : null);
      });
    });
    observer.observe(panel);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [canRefract]);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const panel = event.currentTarget;
    const bounds = panel.getBoundingClientRect();
    panel.style.setProperty("--lg-x", `${event.clientX - bounds.left}px`);
    panel.style.setProperty("--lg-y", `${event.clientY - bounds.top}px`);
  };

  const moveChipTo = (link: HTMLElement) => setChip({ left: link.offsetLeft, width: link.offsetWidth, on: true });
  const hideChip = () => setChip((current) => ({ ...current, on: false }));

  const backdrop = lensMap
    ? `url(#${LENS_FILTER_ID}) blur(2px) saturate(1.6) brightness(0.95)`
    : undefined;

  return (
    <div
      inert={!visible}
      className={`lg-enter fixed left-1/2 top-3 sm:top-4 z-40 w-[calc(100%-1.5rem)] max-w-[940px] -translate-x-1/2 ${
        visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-[170%] scale-90 opacity-0"
      }`}
    >
      {lensMap && (
        <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute h-0 w-0">
          <filter
            id={LENS_FILTER_ID}
            filterUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={lensMap.width}
            height={lensMap.height}
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={lensMap.url}
              x="0"
              y="0"
              width={lensMap.width}
              height={lensMap.height}
              preserveAspectRatio="none"
              result="map"
            />
            {DISPERSION.map(({ name, scale, matrix }) => (
              <Fragment key={name}>
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="map"
                  scale={scale}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result={`${name}-shifted`}
                />
                <feColorMatrix in={`${name}-shifted`} type="matrix" values={matrix} result={name} />
              </Fragment>
            ))}
            {/* Add the channels back together. (feBlend "screen" turns the three-way merge white in Chromium.) */}
            <feComposite in="red" in2="green" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="red-green" />
            <feComposite in="red-green" in2="blue" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
        </svg>
      )}

      <header
        ref={panelRef}
        onPointerMove={handlePointerMove}
        className="lg-panel"
        style={backdrop ? { backdropFilter: backdrop, WebkitBackdropFilter: backdrop } : undefined}
      >
        <span className="lg-glow" aria-hidden="true" />
        <span className="lg-sweep" data-play={visible ? "true" : "false"} aria-hidden="true" />

        <div className="relative z-[3] flex items-center justify-between gap-3 py-2 pl-4 pr-2 sm:pl-5">
          <Link href="/" aria-label="Cleave home" className={`group flex cursor-pointer items-center gap-2.5 rounded-full ${FOCUS_RING}`}>
            <svg width="26" height="26" viewBox="0 0 34 34" aria-hidden="true" className="shrink-0 transition-transform group-hover:scale-105">
              <circle cx="17" cy="17" r="8" fill="#F07A2B" />
              <ellipse cx="17" cy="17" rx="15" ry="4.2" transform="rotate(-14 17 17)" fill="none" stroke="#3B86FF" strokeWidth="1.4" />
              <ellipse
                cx="17"
                cy="17"
                rx="16.5"
                ry="5.6"
                transform="rotate(-14 17 17)"
                fill="none"
                stroke="#EF5F22"
                strokeWidth="1"
                strokeDasharray="5 3"
              />
            </svg>
            <span className="text-[15px] font-medium tracking-[0.36em] text-foreground [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
              CLEAVE
            </span>
          </Link>

          <nav aria-label="Primary" onPointerLeave={hideChip} className="relative hidden md:flex items-center gap-1 text-[14px]">
            <span className="lg-chip" data-on={chip.on} style={{ left: chip.left, width: chip.width }} aria-hidden="true" />
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onPointerEnter={(event) => moveChipTo(event.currentTarget)}
                onFocus={(event) => moveChipTo(event.currentTarget)}
                onBlur={hideChip}
                className={`relative cursor-pointer rounded-full px-3.5 py-1.5 text-white/75 transition-colors hover:text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] ${FOCUS_RING}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/markets"
            className={`lg-cta inline-flex min-h-[38px] cursor-pointer items-center justify-center rounded-full px-4 text-[13px] font-semibold sm:px-5 ${FOCUS_RING}`}
          >
            <span className="relative z-10">Launch app</span>
          </Link>
        </div>
      </header>
    </div>
  );
}
