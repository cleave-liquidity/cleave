"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { EnvironmentStrip } from "@/components/layout/EnvironmentStrip";

export function Navbar({ isLanding = false }: { isLanding?: boolean }) {
  const pathname = usePathname();

  const isMarkets = pathname?.startsWith("/markets");
  const isTrade = pathname?.startsWith("/trade");
  const isPortfolio = pathname === "/portfolio";
  const isDocs = pathname?.startsWith("/docs");
  const isContracts = pathname?.startsWith("/contracts");

  return (
    <header className={`${isLanding ? "absolute top-0 left-0 right-0 z-30" : "sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-white/10"}`}>
      {!isLanding && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          Skip to content
        </a>
      )}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/" aria-label="Cleave home" className="flex items-center gap-3.5 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className="shrink-0 transition-transform group-hover:scale-105">
            <circle cx="17" cy="17" r="8" fill="#F07A2B" />
            <ellipse
              cx="17"
              cy="17"
              rx="15"
              ry="4.2"
              transform="rotate(-14 17 17)"
              fill="none"
              stroke="#A9C8EE"
              strokeWidth="1.4"
            />
            <ellipse
              cx="17"
              cy="17"
              rx="16.5"
              ry="5.6"
              transform="rotate(-14 17 17)"
              fill="none"
              stroke="#F0A85C"
              strokeWidth="1"
              strokeDasharray="5 3"
            />
          </svg>
          <span className="text-[20px] font-medium tracking-[0.42em] text-foreground">
            CLEAVE
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-4 lg:gap-9 text-[14px] lg:text-[15px]">
          <Link
            href="/markets"
            aria-current={isMarkets ? "page" : undefined}
            className={`transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice ${isMarkets ? "text-foreground font-medium" : "text-muted hover:text-foreground"}`}
          >
            Markets
          </Link>
          <Link
            href="/trade"
            aria-current={isTrade ? "page" : undefined}
            className={`transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice ${isTrade ? "text-foreground font-medium" : "text-muted hover:text-foreground"}`}
          >
            Trade Yield
          </Link>
          <Link
            href="/portfolio"
            aria-current={isPortfolio ? "page" : undefined}
            className={`transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice ${isPortfolio ? "text-foreground font-medium" : "text-muted hover:text-foreground"}`}
          >
            Portfolio
          </Link>
          <Link
            href="/docs"
            aria-current={isDocs ? "page" : undefined}
            className={`transition-colors hidden sm:inline-block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice ${isDocs ? "text-foreground font-medium" : "text-muted hover:text-foreground"}`}
          >
            Docs
          </Link>
          <Link
            href="/contracts"
            aria-current={isContracts ? "page" : undefined}
            className={`transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice ${isContracts ? "text-foreground font-medium" : "text-muted hover:text-foreground"}`}
          >
            Contracts
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {isLanding ? (
            <Link
              href="/markets"
              className="inline-flex items-center justify-center min-h-[38px] sm:min-h-[44px] px-4 sm:px-6 border border-amber/55 bg-background/50 hover:bg-amber/15 hover:border-amber transition-colors text-[13px] sm:text-[15px] font-medium"
            >
              Launch app
            </Link>
          ) : (
            <ConnectButton />
          )}
        </div>
      </div>
      {!isLanding && <EnvironmentStrip />}
    </header>
  );
}
