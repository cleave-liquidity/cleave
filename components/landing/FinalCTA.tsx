"use client";

import React from "react";
import Link from "next/link";
import { useMarkets } from "@/hooks/useMarkets";
import { marketHref, pickFeaturedMarket } from "./featuredMarket";

export function FinalCTA() {
  const { markets } = useMarkets();
  const market = pickFeaturedMarket(markets);
  const live = market?.dataMode === "live";
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-10 py-8 overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 50% 105%, rgba(240,122,43,0.3) 0%, rgba(122,46,12,0.08) 42%, rgba(3,3,4,0) 75%)",
        }}
      />

      {/* Decorative orbit art (Saturnus) */}
      <div className="relative z-10 mb-4 sm:mb-6">
        <svg width="150" height="90" viewBox="0 0 160 100" aria-hidden="true" className="block">
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
            <circle r="58" fill="none" stroke="#A9C8EE" strokeWidth="4" opacity="0.65" />
            <circle
              className="ringflow"
              r="72"
              fill="none"
              stroke="#F0A85C"
              strokeWidth="3.5"
              strokeDasharray="12 6 3 8"
              style={{ animationDuration: "18s" }}
            />
          </g>

          {/* Planet body */}
          <circle cx="80" cy="50" r="26" fill="url(#ctapb)" />

          {/* Front orbit rings */}
          <g transform="translate(80 50) rotate(-16) scale(1 0.22)" clipPath="url(#ctafront)">
            <circle r="58" fill="none" stroke="#A9C8EE" strokeWidth="4" opacity="0.65" />
            <circle
              className="ringflow"
              r="72"
              fill="none"
              stroke="#F0A85C"
              strokeWidth="3.5"
              strokeDasharray="12 6 3 8"
              style={{ animationDuration: "18s" }}
            />
          </g>
        </svg>
      </div>

      {/* Headline & Subtitle */}
      <div className="relative z-10 flex flex-col gap-3 max-w-[700px]">
        <div className="mono text-[11px] tracking-[0.24em] text-muted-dark uppercase">
          Ready to trade
        </div>
        <h2 className="m-0 text-[34px] sm:text-[48px] lg:text-[68px] leading-[1.04] font-normal tracking-[-0.035em] text-balance">
          Choose how you
          <br />
          <span className="text-foreground">hold yield.</span>
        </h2>
        <p className="m-0 text-[14px] sm:text-[16px] leading-[1.6] text-muted font-light max-w-[440px] mx-auto">
          Lock a fixed rate or go long on where yield is heading — all in {market ? market.symbol : "one asset"}, settled
          on Robinhood Chain.
        </p>
      </div>

      {/* Action buttons */}
      <div className="relative z-10 flex items-center gap-3 flex-wrap justify-center mt-6">
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 min-h-[48px] sm:min-h-[52px] px-7 bg-foreground text-background font-medium text-[14px] sm:text-[15px] hover:bg-white transition-all shadow-[0_0_28px_rgba(255,255,255,0.18)]"
        >
          Explore markets &rarr;
        </Link>
        <Link
          href={market ? marketHref(market.id) : "/markets"}
          className="inline-flex items-center gap-2 min-h-[48px] sm:min-h-[52px] px-6 border border-white/20 text-[14px] sm:text-[15px] hover:border-white/40 transition-colors"
        >
          Open a position
        </Link>
      </div>

      {/* Footnote */}
      <p className="relative z-10 mono text-[10px] sm:text-[11px] tracking-[0.08em] text-muted-dark max-w-[400px] mx-auto mt-4">
        {live ? "Live data from Pendle." : "Sample data shown throughout."} Built on Robinhood Chain.
      </p>
    </div>
  );
}
