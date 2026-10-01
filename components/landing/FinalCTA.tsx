"use client";

import React from "react";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section
      className="relative isolate mt-20 sm:mt-28 lg:mt-36 py-28 sm:py-36 lg:py-48 px-4 sm:px-6 lg:px-10 flex flex-col items-center text-center gap-8 overflow-hidden"
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 50% 110%, rgba(240,122,43,0.28) 0%, rgba(122,46,12,0.08) 40%, rgba(3,3,4,0) 70%)",
        }}
      />
      {/* Top horizontal separator with glow */}
      <div className="absolute top-0 left-0 right-0 h-px">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      {/* Decorative orbit art */}
      <svg width="160" height="100" viewBox="0 0 160 100" aria-hidden="true" className="relative">
        <defs>
          <radialGradient id="ctapb" cx="30%" cy="22%" r="88%">
            <stop offset="0%" stopColor="#FFD7A8" />
            <stop offset="28%" stopColor="#D2601F" />
            <stop offset="65%" stopColor="#4A1806" />
            <stop offset="100%" stopColor="#120502" />
          </radialGradient>
          <clipPath id="ctaback">
            <rect x="-500" y="-500" width="1000" height="500" />
          </clipPath>
          <clipPath id="ctafront">
            <rect x="-500" y="0" width="1000" height="500" />
          </clipPath>
        </defs>

        {/* Back orbit rings */}
        <g transform="translate(80 50) rotate(-16) scale(1 0.22)" clipPath="url(#ctaback)">
          <circle r="58" fill="none" stroke="#A9C8EE" strokeWidth="5" opacity="0.7" />
          <circle className="ringflow" r="72" fill="none" stroke="#F0A85C" strokeWidth="4" strokeDasharray="12 6 3 8" style={{ animationDuration: "18s" }} />
        </g>

        {/* Planet body */}
        <circle cx="80" cy="50" r="28" fill="url(#ctapb)" />

        {/* Front orbit rings */}
        <g transform="translate(80 50) rotate(-16) scale(1 0.22)" clipPath="url(#ctafront)">
          <circle r="58" fill="none" stroke="#A9C8EE" strokeWidth="5" opacity="0.7" />
          <circle className="ringflow" r="72" fill="none" stroke="#F0A85C" strokeWidth="4" strokeDasharray="12 6 3 8" style={{ animationDuration: "18s" }} />
        </g>
      </svg>

      {/* Headline */}
      <div className="relative flex flex-col gap-4 max-w-[740px]">
        <div className="mono text-[11px] tracking-[0.22em] text-muted-dark uppercase">
          Ready to trade
        </div>
        <h2 className="m-0 text-[40px] sm:text-[58px] lg:text-[80px] leading-[1.02] font-normal tracking-[-0.035em] text-balance">
          Choose how you
          <br />hold yield.
        </h2>
        <p className="m-0 text-[17px] sm:text-[18px] leading-[1.6] text-muted font-light max-w-[460px] mx-auto">
          Lock a fixed rate or go long on where yield is heading — all in USDG,
          all on Robinhood Chain.
        </p>
      </div>

      {/* CTAs */}
      <div className="relative flex items-center gap-3 flex-wrap justify-center">
        <Link
          href="/markets"
          className="inline-flex items-center gap-2.5 min-h-[54px] px-8 bg-foreground text-background font-medium text-[15px] hover:bg-white transition-colors"
        >
          Explore markets <span aria-hidden="true">→</span>
        </Link>
        <Link
          href="/trade?market=usdg-morpho-26mar27"
          className="inline-flex items-center gap-2 min-h-[54px] px-7 border border-white/20 text-[15px] hover:border-white/40 transition-colors"
        >
          Open a position
        </Link>
      </div>

      {/* Bottom footnote */}
      <p className="relative mono text-[11px] tracking-[0.1em] text-muted-dark max-w-[420px] mx-auto mt-2">
        Sample data shown throughout. Not financial advice. Do your own research.
      </p>
    </section>
  );
}
