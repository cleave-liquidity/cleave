import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { DataModeBadge } from "@/components/layout/DataModeBadge";
import { getConfiguredDataMode } from "@/lib/adapters/config";

export function TradeUnavailableState() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />
        <main id="main-content" className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-10">
          <DataModeBadge mode={getConfiguredDataMode()} />
          <h1 className="mt-6 text-[32px] font-normal tracking-[-0.03em] text-foreground">
            Live trading is unavailable
          </h1>
          <p className="mt-3 max-w-[520px] text-[15px] leading-6 text-muted">
            The configured market source did not return a verified market. No mock market was substituted.
          </p>
          <Link href="/trade" className="mt-7 inline-flex min-h-[44px] items-center border border-ice/50 bg-ice/10 px-5 text-[14px] text-ice transition-colors hover:bg-ice/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
            Choose a live market
          </Link>
        </main>
        <Footer />
      </div>
    </div>
  );
}
