"use client";

import Link from "next/link";
import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { XIcon } from "@/components/layout/XIcon";
import { X_URL } from "@/lib/site-links";
import { buildLensMapUrl, supportsBackdropLens } from "./liquidGlass";
import Image from "next/image";

const HERO_ID = "top";
const LENS_FILTER_ID = "yeltra-liquid-lens";

const LINKS = [
  { href: "/markets", label: "Markets" },
  { href: "/trade", label: "Trade Yield" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/docs", label: "Docs" },
  { href: "/contracts", label: "Contracts" },
] as const;

// Different shifts per colour channel split the bent image into the rainbow fringe real glass has at its rim.
const DISPERSION = [
  {
    name: "red",
    scale: 34,
    matrix: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  },
  {
    name: "green",
    scale: 46,
    matrix: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  },
  {
    name: "blue",
    scale: 58,
    matrix: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
  },
] as const;

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice";

// Below `md` the inline links do not fit, so they collapse into this dropdown under the pill. Must match the `md:` breakpoint used on the nav.
const DESKTOP_QUERY = "(min-width: 768px)";

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
  const [lensMap, setLensMap] = useState<{
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const canRefract = useSyncExternalStore(
    subscribeNothing,
    readLensSupport,
    () => false,
  );

  useEffect(() => {
    const hero = document.getElementById(HERO_ID);

    if (!hero || typeof IntersectionObserver === "undefined") {
      const onScroll = () => {
        const past = window.scrollY > window.innerHeight;
        setVisible(past);
        if (!past) setMenuOpen(false);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    // The hero is the first block of the page, so "not intersecting" can only mean it is above the
    // viewport. The callback also fires once on mount, which keeps reloads and #anchors correct.
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
        if (entry.isIntersecting) setMenuOpen(false);
      },
      { threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // While the mobile menu is open: Escape, a tap outside, or growing past the mobile breakpoint all close it.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onBreakpoint = () => {
      if (desktop.matches) setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [menuOpen]);

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

  const moveChipTo = (link: HTMLElement) =>
    setChip({ left: link.offsetLeft, width: link.offsetWidth, on: true });
  const hideChip = () => setChip((current) => ({ ...current, on: false }));

  const backdrop = lensMap
    ? `url(#${LENS_FILTER_ID}) blur(2px) saturate(1.6) brightness(0.95)`
    : undefined;

  return (
    <div
      ref={rootRef}
      inert={!visible}
      className={`lg-enter fixed left-1/2 top-3 sm:top-4 z-40 w-[calc(100%-1.5rem)] max-w-[940px] -translate-x-1/2 ${
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none -translate-y-[170%] scale-90 opacity-0"
      }`}
    >
      {lensMap && (
        <svg
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute h-0 w-0"
        >
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
                <feColorMatrix
                  in={`${name}-shifted`}
                  type="matrix"
                  values={matrix}
                  result={name}
                />
              </Fragment>
            ))}
            {/* Add the channels back together. (feBlend "screen" turns the three-way merge white in Chromium.) */}
            <feComposite
              in="red"
              in2="green"
              operator="arithmetic"
              k1="0"
              k2="1"
              k3="1"
              k4="0"
              result="red-green"
            />
            <feComposite
              in="red-green"
              in2="blue"
              operator="arithmetic"
              k1="0"
              k2="1"
              k3="1"
              k4="0"
            />
          </filter>
        </svg>
      )}

      <header
        ref={panelRef}
        onPointerMove={handlePointerMove}
        className="lg-panel"
        style={
          backdrop
            ? { backdropFilter: backdrop, WebkitBackdropFilter: backdrop }
            : undefined
        }
      >
        <span className="lg-glow" aria-hidden="true" />
        <span
          className="lg-sweep"
          data-play={visible ? "true" : "false"}
          aria-hidden="true"
        />

        <div className="relative z-[3] flex items-center justify-between gap-3 py-2 pl-4 pr-2 sm:pl-5">
          <Link
            href="/"
            aria-label="Yeltra home"
            className={`group flex cursor-pointer items-center gap-2.5 rounded-full ${FOCUS_RING}`}
          >
            <Image src="/logo.png" alt="Yeltra logo" width={34} height={34} className="shrink-0" />
            <span className="text-[15px] font-medium tracking-[0.36em] text-foreground max-[359px]:tracking-[0.22em] [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
              YELTRA
            </span>
          </Link>

          <nav
            aria-label="Primary"
            onPointerLeave={hideChip}
            className="relative hidden md:flex items-center gap-1 text-[14px]"
          >
            <span
              className="lg-chip"
              data-on={chip.on}
              style={{ left: chip.left, width: chip.width }}
              aria-hidden="true"
            />
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

          <div className="flex items-center gap-1.5">
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YELTRA on X (opens in a new tab)"
              className={`hidden h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex ${FOCUS_RING}`}
            >
              <XIcon className="h-4 w-4" />
            </a>

            <Link
              href="/markets"
              className={`lg-cta inline-flex min-h-[38px] cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-4 text-[13px] font-semibold max-[359px]:px-3 sm:px-5 ${FOCUS_RING}`}
            >
              <span className="relative z-10">Launch app</span>
            </Link>

            <button
              ref={toggleRef}
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
              className={`inline-flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden ${FOCUS_RING}`}
            >
              <span aria-hidden="true" className="relative block h-3.5 w-[18px]">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-full rounded-full bg-current transition-transform duration-300 motion-reduce:transition-none ${menuOpen ? "translate-y-[6px] rotate-45" : ""}`}
                />
                <span
                  className={`absolute left-0 top-[6px] h-0.5 w-full rounded-full bg-current transition-opacity duration-200 motion-reduce:transition-none ${menuOpen ? "opacity-0" : ""}`}
                />
                <span
                  className={`absolute left-0 top-3 h-0.5 w-full rounded-full bg-current transition-transform duration-300 motion-reduce:transition-none ${menuOpen ? "-translate-y-[6px] -rotate-45" : ""}`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu. The wrapper owns position and motion; .lg-panel (which forces position + a pill radius) sits inside it. */}
      <div
        id={menuId}
        inert={!menuOpen}
        className={`absolute inset-x-0 top-full mt-2 origin-top transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none md:hidden ${
          menuOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div
          onPointerMove={handlePointerMove}
          className="lg-panel"
          style={{
            borderRadius: 28,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.015) 48%, rgba(255,255,255,0.03) 100%), rgba(9,10,13,0.82)",
            backdropFilter: "blur(18px) saturate(1.6)",
            WebkitBackdropFilter: "blur(18px) saturate(1.6)",
          }}
        >
          <span className="lg-glow" aria-hidden="true" />
          <nav
            aria-label="Menu"
            className="relative z-[3] flex flex-col gap-0.5 p-2"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex min-h-[48px] cursor-pointer items-center justify-between rounded-[20px] px-4 text-[15px] text-white/85 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 ${FOCUS_RING}`}
              >
                {link.label}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 text-white/40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 3.5 10.5 8 6 12.5" />
                </svg>
              </Link>
            ))}

            {/* The X icon leaves the pill on phones to make room for the menu button, so it lives here instead. */}
            <div className="mx-4 my-1 h-px bg-white/10 sm:hidden" aria-hidden="true" />
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-[20px] px-4 text-[15px] text-white/85 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 sm:hidden ${FOCUS_RING}`}
            >
              <XIcon className="h-4 w-4" />
              Follow on X
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
}
