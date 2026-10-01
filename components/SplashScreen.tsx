"use client";

import React, { useState, useEffect } from "react";

// ─── Snappy timing constants (ms) ──────────────────────────────────────────
const HOLD_MS = 1250;          // Time before exit sequence triggers
const CONTENT_FADE_MS = 120;   // Content fade out
const STRIP_COUNT = 8;         // Number of vertical column strips
const STRIP_DUR_MS = 420;      // Each strip slide-up duration
const STRIP_STAGGER_MS = 38;   // Stagger between columns (left to right)
const TOTAL_EXIT_MS = STRIP_STAGGER_MS * (STRIP_COUNT - 1) + STRIP_DUR_MS;
const UNMOUNT_MS = HOLD_MS + CONTENT_FADE_MS + TOTAL_EXIT_MS + 50;

export function SplashScreen() {
  const [phase, setPhase] = useState<"in" | "exit" | "done">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("exit"), HOLD_MS);
    const t2 = setTimeout(() => setPhase("done"), UNMOUNT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "done") return null;

  const isExiting = phase === "exit";

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden pointer-events-auto"
      aria-live="polite"
      aria-label="Loading Cleave"
    >
      {/* ── BACKGROUND COLUMN STRIPS (Reveal curtain from left to right) ── */}
      <div className="absolute inset-0 flex pointer-events-none" aria-hidden="true">
        {Array.from({ length: STRIP_COUNT }).map((_, i) => (
          <div
            key={i}
            className="h-full bg-background border-r border-white/[0.04]"
            style={{
              width: `${100 / STRIP_COUNT}%`,
              transform: isExiting ? "translateY(-101%)" : "translateY(0%)",
              transition: isExiting
                ? `transform ${STRIP_DUR_MS}ms cubic-bezier(0.72, 0, 0.28, 1) ${i * STRIP_STAGGER_MS}ms`
                : "none",
              willChange: "transform",
            }}
          />
        ))}
      </div>

      {/* ── CENTER LOGO, TITLE & PROGRESS ─────────────────────────── */}
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 sm:gap-7 pointer-events-none select-none px-4"
        style={{
          opacity: isExiting ? 0 : 1,
          transform: isExiting ? "scale(0.97)" : "scale(1)",
          transition: `opacity ${CONTENT_FADE_MS}ms ease, transform ${CONTENT_FADE_MS}ms ease`,
        }}
      >
        {/* Animated Mini Celestial Planet */}
        <div className="relative">
          <svg
            width="160"
            height="160"
            viewBox="-80 -80 160 160"
            aria-hidden="true"
            className="block"
          >
            <defs>
              <radialGradient id="sp-body" cx="30%" cy="22%" r="82%">
                <stop offset="0%" stopColor="#FFD7A8" />
                <stop offset="22%" stopColor="#D2601F" />
                <stop offset="58%" stopColor="#5A2008" />
                <stop offset="100%" stopColor="#120502" />
              </radialGradient>
              <radialGradient id="sp-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(240,122,43,0.22)" />
                <stop offset="100%" stopColor="rgba(240,122,43,0)" />
              </radialGradient>
              <clipPath id="sp-back">
                <rect x="-180" y="-180" width="360" height="180" />
              </clipPath>
              <clipPath id="sp-front">
                <rect x="-180" y="0" width="360" height="180" />
              </clipPath>
            </defs>

            {/* Ambient core glow */}
            <circle r="68" fill="url(#sp-glow)" />

            {/* Back orbit rings */}
            <g transform="rotate(-20) scale(1 0.24)" clipPath="url(#sp-back)">
              <circle
                r="54"
                fill="none"
                stroke="rgba(169,200,238,0.6)"
                strokeWidth="1.2"
                className="ringflow"
                style={{ animationDuration: "14s" }}
              />
              <circle
                r="68"
                fill="none"
                stroke="rgba(240,168,92,0.55)"
                strokeWidth="0.9"
                strokeDasharray="8 16"
                className="ringflow"
                style={{ animationDuration: "18s", animationDirection: "reverse" }}
              />
              <circle
                r="82"
                fill="none"
                stroke="rgba(236,237,234,0.12)"
                strokeWidth="0.7"
              />
            </g>

            {/* Planet sphere */}
            <circle r="27" fill="url(#sp-body)" />
            <ellipse
              rx="27"
              ry="5.5"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.8"
            />
            <circle
              r="27"
              fill="none"
              stroke="rgba(255,210,160,0.12)"
              strokeWidth="1.2"
            />

            {/* Front orbit rings */}
            <g transform="rotate(-20) scale(1 0.24)" clipPath="url(#sp-front)">
              <circle
                r="54"
                fill="none"
                stroke="rgba(169,200,238,0.6)"
                strokeWidth="1.2"
                className="ringflow"
                style={{ animationDuration: "14s" }}
              />
              <circle
                r="68"
                fill="none"
                stroke="rgba(240,168,92,0.55)"
                strokeWidth="0.9"
                strokeDasharray="8 16"
                className="ringflow"
                style={{ animationDuration: "18s", animationDirection: "reverse" }}
              />
            </g>
          </svg>
        </div>

        {/* Title & Brand */}
        <div className="flex flex-col items-center gap-2.5">
          <h1
            className="m-0 font-normal tracking-[-0.035em] text-foreground text-center"
            style={{ fontSize: "clamp(42px, 8vw, 84px)", lineHeight: 1 }}
          >
            {"CLEAVE".split("").map((char, i) => (
              <span
                key={i}
                className="inline-block splash-char"
                style={{ animationDelay: `${i * 45}ms` }}
              >
                {char}
              </span>
            ))}
          </h1>

          <p
            className="m-0 mono splash-sub text-muted tracking-[0.3em] uppercase text-center"
            style={{ fontSize: "clamp(10px, 1.1vw, 12px)" }}
          >
            Cleave Liquidity
          </p>
        </div>

        {/* Loading progress bar */}
        <div
          className="relative overflow-hidden bg-white/10 rounded-full"
          style={{ width: "clamp(120px, 14vw, 180px)", height: "2px" }}
        >
          <div className="absolute left-0 top-0 h-full bg-ice splash-bar rounded-full" />
        </div>
      </div>

      {/* Skip button for instant bypass */}
      <button
        type="button"
        className="absolute bottom-6 right-6 z-30 mono text-[11px] tracking-[0.18em] text-muted-dark hover:text-foreground transition-colors uppercase cursor-pointer"
        onClick={() => setPhase("exit")}
        aria-label="Skip splash screen"
        style={{
          opacity: isExiting ? 0 : 0.7,
          transition: "opacity 120ms ease",
        }}
      >
        Skip →
      </button>
    </div>
  );
}
