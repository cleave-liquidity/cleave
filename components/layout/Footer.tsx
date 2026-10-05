import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/12 bg-background">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10 flex justify-between items-center gap-5 flex-wrap">
        <span className="text-[15px] font-medium tracking-[0.42em] text-foreground">
          YELTRA
        </span>
        <span className="text-[13px] text-muted-dark text-center sm:text-left">
          Independent app on Robinhood Chain. Not affiliated with Robinhood Markets.
        </span>
        <nav aria-label="Footer" className="flex items-center gap-5 text-[14px]">
          <Link href="/markets" className="text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice">
            Markets
          </Link>
          <Link href="/docs" className="text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice">
            Docs
          </Link>
          <Link href="/contracts" className="text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice">
            Contracts
          </Link>
        </nav>
      </div>
    </footer>
  );
}
