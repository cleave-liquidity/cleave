"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/wallet/ConnectButton";

export function Navbar({ isLanding = false }: { isLanding?: boolean }) {
  const pathname = usePathname();

  const isMarkets = pathname?.startsWith("/markets");
  const isPortfolio = pathname === "/portfolio";

  return (
    <header className={`${isLanding ? "absolute top-0 left-0 right-0 z-30" : "sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-white/10"}`}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/" aria-label="Cleave home" className="flex items-center gap-3.5 group">
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

        <nav aria-label="Primary" className="hidden md:flex items-center gap-6 lg:gap-10 text-[15px]">
          <Link
            href="/markets"
            className={`transition-colors ${isMarkets ? "text-foreground font-medium" : "text-muted hover:text-foreground"}`}
          >
            Markets
          </Link>
          <Link
            href="/portfolio"
            className={`transition-colors ${isPortfolio ? "text-foreground font-medium" : "text-muted hover:text-foreground"}`}
          >
            Portfolio
          </Link>
          {isLanding ? (
            <a href="#how" className="text-muted hover:text-foreground transition-colors">
              How it works
            </a>
          ) : (
            <Link href="/#how" className="text-muted hover:text-foreground transition-colors">
              How it works
            </Link>
          )}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-foreground transition-colors hidden sm:inline-block"
          >
            Docs
          </a>
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
    </header>
  );
}
