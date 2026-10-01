"use client";

import React from "react";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section
      className="relative isolate mt-20 sm:mt-28 lg:mt-36 py-24 sm:py-32 lg:py-40 px-4 sm:px-6 lg:px-10 flex flex-col items-center text-center gap-7"
      style={{
        background:
          "radial-gradient(ellipse 60% 70% at 50% 120%, rgba(240,122,43,0.32), rgba(122,46,12,0.10) 45%, rgba(3,3,4,0) 75%)",
      }}
    >
      {/* Mini Planet Artwork */}
      <svg width="140" height="90" viewBox="0 0 140 90" aria-hidden="true">
        <defs>
          <radialGradient id="minipb" cx="30%" cy="22%" r="88%">
            <stop offset="0%" stopColor="#FFD7A8" />
            <stop offset="30%" stopColor="#D2601F" />
            <stop offset="70%" stopColor="#4A1806" />
            <stop offset="100%" stopColor="#120502" />
          </radialGradient>
          <clipPath id="miniback">
            <rect x="-500" y="-500" width="1000" height="500" />
          </clipPath>
          <clipPath id="minifront">
            <rect x="-500" y="0" width="1000" height="500" />
          </clipPath>
        </defs>
        <g
          transform="translate(70 45) rotate(-14) scale(1 0.24)"
          clipPath="url(#miniback)"
        >
          <circle
            r="50"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="6"
            opacity="0.8"
          />
          <circle
            className="ringflow"
            r="62"
            fill="none"
            stroke="#F0A85C"
            strokeWidth="5"
            strokeDasharray="14 6 4 8"
            style={{ animationDuration: "20s" }}
          />
        </g>
        <circle cx="70" cy="45" r="26" fill="url(#minipb)" />
        <g
          transform="translate(70 45) rotate(-14) scale(1 0.24)"
          clipPath="url(#minifront)"
        >
          <circle
            r="50"
            fill="none"
            stroke="#A9C8EE"
            strokeWidth="6"
            opacity="0.8"
          />
          <circle
            className="ringflow"
            r="62"
            fill="none"
            stroke="#F0A85C"
            strokeWidth="5"
            strokeDasharray="14 6 4 8"
            style={{ animationDuration: "20s" }}
          />
        </g>
      </svg>

      <h2 className="m-0 text-[42px] sm:text-[60px] lg:text-[84px] leading-[1] font-normal tracking-[-0.035em] text-balance">
        Choose how you hold yield.
      </h2>

      <Link
        href="/markets"
        className="inline-flex items-center gap-2.5 min-h-[54px] px-8.5 bg-foreground text-background font-medium text-[16px] hover:bg-white transition-colors"
      >
        Explore markets <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
