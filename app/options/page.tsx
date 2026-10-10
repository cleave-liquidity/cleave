"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { OptionsOverview } from "@/components/options/OptionsOverview";

export default function OptionsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />
        <main id="main-content" className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
          <div className="mb-7"><div className="mono text-[11px] uppercase tracking-[0.18em] text-muted-dark">YELTRA / Mainnet product preview</div><p className="mt-2 m-0 text-[13px] text-muted-dark">Yield Rate Options is not live on Mainnet and remains separate from Fixed Yield, Trading Yield, and Dividend Earn.</p></div>
          <OptionsOverview />
        </main>
        <Footer />
      </div>
    </div>
  );
}
