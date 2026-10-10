"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { EnvironmentStrip } from "@/components/layout/EnvironmentStrip";
import { XIcon } from "@/components/layout/XIcon";
import { X_URL } from "@/lib/site-links";
import Image from "next/image";
import { ContractAddress } from "../landing/ContractAddress";

/**
 * Row layout. The landing header keeps its original classes untouched. Internal pages stay on ONE row at every width:
 * the logo and the right-hand cluster never shrink or wrap, the nav is the flexible middle (its link spacing adapts),
 * and the secondary controls collapse in a fixed order as width shrinks instead of dropping to a second row.
 */
const ROW = {
  landing: "max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6 flex items-center justify-between gap-4 flex-wrap",
  app: "max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6 flex flex-nowrap items-center gap-3 lg:gap-6",
} as const;

const LOGO_LINK =
  "flex items-center gap-3.5 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice";
const LOGO_TEXT = "text-[20px] font-medium tracking-[0.42em] text-foreground";
// Phones: a tighter wordmark so logo + wallet button fit down to 320 px.
const LOGO_TEXT_APP =
  "text-[20px] max-[339px]:text-[16px] font-medium tracking-[0.42em] max-[399px]:tracking-[0.25em] text-foreground";

const NAV_LANDING = "hidden md:flex items-center gap-4 lg:gap-9 text-[14px] lg:text-[15px]";
// Same look as the landing nav when there is room (max width = the old natural width), and the links
// pull closer together (never below the minimum gap) when the right-hand cluster needs the space.
const NAV_APP =
  "hidden md:flex min-w-0 flex-1 items-center justify-between gap-x-3 lg:gap-x-4 mx-auto md:max-w-[390px] lg:max-w-[480px] whitespace-nowrap text-[14px] lg:text-[15px]";

export function Navbar({ isLanding = false }: { isLanding?: boolean }) {
  const pathname = usePathname();

  const isMarkets = pathname?.startsWith("/markets");
  const isTrade = pathname?.startsWith("/trade");
  const isOptions = pathname?.startsWith("/options");
  const isPortfolio = pathname === "/portfolio";
  const isDocs = pathname?.startsWith("/docs");
  const isContracts = pathname?.startsWith("/contracts");
  const mobileLinks = [
    { label: "Markets", href: "/markets", active: Boolean(isMarkets) },
    { label: "Trade Yield", href: "/trade", active: Boolean(isTrade) },
    { label: "Options", href: "/options", active: Boolean(isOptions) },
    { label: "Portfolio", href: "/portfolio", active: Boolean(isPortfolio) },
    { label: "Docs", href: "/docs", active: Boolean(isDocs) },
    { label: "Contracts", href: "/contracts", active: Boolean(isContracts) },
  ];

  return (
    <header
      className={`${isLanding ? "absolute top-0 left-0 right-0 z-30" : "sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-white/10"}`}
    >
      {!isLanding && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          Skip to content
        </a>
      )}
      <div className={isLanding ? ROW.landing : ROW.app}>
        <Link
          href="/"
          aria-label="Yeltra home"
          className={isLanding ? LOGO_LINK : `shrink-0 ${LOGO_LINK}`}
        >
          <Image src="/logo.png" alt="Yeltra logo" width={34} height={34} className={isLanding ? undefined : "shrink-0"} />
          <span className={isLanding ? LOGO_TEXT : LOGO_TEXT_APP}>
            YELTRA
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className={isLanding ? NAV_LANDING : NAV_APP}
        >
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
            href="/options"
            aria-current={isOptions ? "page" : undefined}
            className={`transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice ${isOptions ? "text-foreground font-medium" : "text-muted hover:text-foreground"}`}
          >
            Options
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
        {isLanding && <ContractAddress />}

        <div className={isLanding ? "flex items-center gap-3" : "flex shrink-0 items-center gap-2 lg:gap-3"}>
          {!isLanding && <ContractAddress />}
          {isLanding && (
            <Link
              href="/options"
              aria-current={isOptions ? "page" : undefined}
              className="inline-flex min-h-[38px] items-center px-2 text-[12px] text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice md:hidden"
            >
              Options
            </Link>
          )}
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YELTRA on X (opens in a new tab)"
            className={`items-center justify-center border border-white/20 bg-background/50 text-muted transition-colors hover:border-white/40 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice ${
              isLanding
                ? "inline-flex h-[38px] w-[38px] sm:h-[44px] sm:w-[44px]"
                : "hidden h-[46px] w-[46px] sm:inline-flex md:hidden lg:inline-flex"
            }`}
          >
            <XIcon className="h-[15px] w-[15px]" />
          </a>
          {isLanding ? (
            <Link
              href="/markets"
              className="inline-flex items-center justify-center min-h-[38px] sm:min-h-[44px] px-4 sm:px-6 border border-amber bg-background/50 hover:bg-amber/20 transition-colors text-[13px] sm:text-[15px] font-medium"
            >
              Launch app
            </Link>
          ) : (
            <ConnectButton variant="navbar" />
          )}
        </div>
      </div>
      {!isLanding && (
        <nav
          aria-label="Primary mobile"
          className="flex gap-5 overflow-x-auto border-t border-white/[0.06] px-4 py-2.5 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden"
        >
          {mobileLinks.map(({ label, href, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice ${active ? "font-medium text-foreground" : "text-muted hover:text-foreground"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      {!isLanding && <EnvironmentStrip />}
    </header>
  );
}
