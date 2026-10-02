import React from "react";
import { Hero } from "@/components/landing/Hero";
import { YieldSplitSection } from "@/components/landing/YieldSplitSection";
import { StrategySection } from "@/components/landing/StrategySection";
import { MarketsPreview } from "@/components/landing/MarketsPreview";
import { TradePreview } from "@/components/landing/TradePreview";
import { MaturityPreview } from "@/components/landing/MaturityPreview";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Footer } from "@/components/layout/Footer";

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen relative" style={{ overflowX: "clip" }}>
      {/* ── 1. MAIN CONTENT CURTAIN WRAPPER ─────────────────────────────────
          Has a solid background (bg-background) and higher z-index (z-10)
          so it completely conceals the sticky footer underneath until scrolled.
      ────────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 bg-background shadow-[0_50px_120px_rgba(0,0,0,0.95)]">
        <Hero />
        <YieldSplitSection />
        <StrategySection />
        <MarketsPreview />
        <TradePreview />
        <MaturityPreview />
      </div>
      <ScrollReveal />

      {/* ── 2. SCROLL SPACER ────────────────────────────────────────────────
          Provides 100vh scroll runway so the main content curtain peels away
          smoothly to reveal the fixed footer underneath.
      ────────────────────────────────────────────────────────────────────── */}
      <div className="relative h-screen w-full pointer-events-none" aria-hidden="true" />

      {/* ── 3. STICKY FOOTER REVEAL ─────────────────────────────────────────
          Fixed at bottom: 0 with lower z-index (z-0).
          Unites FinalCTA (Saturnus) + Footer in exactly ONE 100vh frame.
      ────────────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 h-screen z-0 flex flex-col justify-between overflow-hidden bg-background pointer-events-auto">
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
}
