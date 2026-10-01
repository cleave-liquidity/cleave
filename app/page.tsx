import React from "react";
import { Hero } from "@/components/landing/Hero";
import { YieldSplitSection } from "@/components/landing/YieldSplitSection";
import { StrategySection } from "@/components/landing/StrategySection";
import { MarketsPreview } from "@/components/landing/MarketsPreview";
import { TradePreview } from "@/components/landing/TradePreview";
import { MaturityPreview } from "@/components/landing/MaturityPreview";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/layout/Footer";

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen" style={{ overflowX: "clip" }}>
      <Hero />
      <YieldSplitSection />
      <StrategySection />
      <MarketsPreview />
      <TradePreview />
      <MaturityPreview />
      <FinalCTA />
      <Footer />
    </div>
  );
}
