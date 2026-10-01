"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { HeroVisual } from "./HeroVisual";
import { Navbar } from "@/components/layout/Navbar";

const VERBS = ["Splitting", "Fixing", "Trading", "Pricing"];
const ICE = "#A9C8EE";
const AMBER = "#F0A85C";

export function Hero() {
  const [verbIndex, setVerbIndex] = useState(0);
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    const isReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (isReducedMotion) return;

    const interval = setInterval(() => {
      setAnimating(false);
      setTimeout(() => {
        setVerbIndex((prev) => (prev + 1) % VERBS.length);
        setAnimating(true);
      }, 50);
    }, 2600);

    return () => clearInterval(interval);
  }, []);

  const currentVerb = VERBS[verbIndex];
  const verbColor = verbIndex % 2 === 0 ? ICE : AMBER;

  return (
    <section id="top" className="relative isolate min-h-[860px] lg:h-[940px] overflow-hidden bg-background">
      <HeroVisual />

      {/* Shadow vignette over hero center for typography contrast */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 w-[1000px] h-[520px] -ml-[500px] -mt-[250px] z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(3,3,4,0.58), rgba(3,3,4,0.26) 60%, rgba(3,3,4,0) 100%)",
        }}
      />

      <Navbar isLanding={true} />

      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center gap-6 px-4 pt-16 sm:pt-20">
        <div className="mono flex items-center gap-2.5 text-[12px] tracking-[0.18em] text-muted uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-primary" />
          <span>Yield trading for everyone on Robinhood Chain</span>
        </div>

        <h1 className="m-0 text-[52px] sm:text-[76px] lg:text-[120px] leading-[0.96] font-normal tracking-[-0.035em] text-balance drop-shadow-[0_2px_40px_rgba(3,3,4,0.7)]">
          <span
            className={`inline-block ${animating ? "verb" : ""}`}
            style={{ color: verbColor }}
          >
            {currentVerb}
          </span>{" "}
          Yield
        </h1>

        <p className="m-0 max-w-[620px] text-[18px] sm:text-[21px] leading-[1.5] text-muted-light font-light text-pretty drop-shadow-[0_1px_18px_rgba(3,3,4,0.9)]">
          Lock a fixed rate on your USDG, or go long on where yield is heading.
          Two choices, every number in dollars.
        </p>

        <div className="flex gap-3.5 flex-wrap justify-center mt-2">
          <Link
            href="/markets"
            className="inline-flex items-center gap-2.5 min-h-[52px] px-7 sm:px-8 bg-foreground text-background font-medium text-[16px] hover:bg-white transition-colors"
          >
            Explore markets <span aria-hidden="true">→</span>
          </Link>
          <a
            href="#how"
            className="inline-flex items-center min-h-[52px] px-7 sm:px-8 border border-white/30 text-[16px] bg-background/55 hover:border-white/50 transition-colors"
          >
            How the split works
          </a>
        </div>
      </div>
    </section>
  );
}
