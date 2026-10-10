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
          <OptionsOverview />
        </main>
        <Footer />
      </div>
    </div>
  );
}
