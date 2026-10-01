import Link from "next/link";
import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { DataModeBadge } from "@/components/layout/DataModeBadge";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";

const sections = [
  ["start", "00 / Start here"],
  ["fixed", "01 / Fixed Yield"],
  ["long", "02 / Long Yield"],
  ["rates", "03 / Understanding rates"],
  ["maturity", "04 / Maturity"],
  ["risk", "05 / Risk"],
  ["wallet", "06 / Wallet & network"],
  ["preview", "07 / Preview vs live"],
  ["glossary", "08 / Glossary"],
] as const;

export default function DocsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />

        <main id="main-content" className="mx-auto flex w-full max-w-[1240px] flex-1 gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
          <aside className="hidden w-[220px] shrink-0 lg:block">
            <div className="sticky top-32">
              <div className="mono mb-4 text-[11px] uppercase tracking-[0.18em] text-muted-dark">
                CLEAVE / GUIDE
              </div>
              <nav aria-label="Guide sections" className="flex flex-col border-l border-white/12">
                {sections.map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="border-l border-transparent px-4 py-2 text-[13px] text-muted transition-colors hover:border-ice hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ice"
                  >
                    {label}
                  </a>
                ))}
              </nav>
              <div className="mt-10 border-t border-white/10 pt-4 text-[12px] leading-5 text-muted-dark">
                <p className="m-0">A calm guide to choosing, reading, and managing yield exposure.</p>
                <Link href="/markets" className="mt-4 inline-flex text-ice hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice">
                  Explore markets →
                </Link>
              </div>
            </div>
          </aside>

          <article className="min-w-0 max-w-[760px] flex-1">
            <header className="mb-12 border-b border-white/12 pb-10">
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="mono text-[11px] uppercase tracking-[0.18em] text-muted-dark">
                  User guide / Yield system
                </span>
                <DataModeBadge mode={yieldAdapter.mode} />
              </div>
              <h1 className="max-w-[700px] text-[42px] font-normal leading-[1.02] tracking-[-0.04em] text-foreground sm:text-[64px]">
                Yield trading without the complexity.
              </h1>
              <p className="mt-6 max-w-[600px] text-[17px] leading-7 text-muted">
                CLEAVE turns a yield market into two readable choices: lock in a rate with Fixed Yield, or take a view on where yield is heading with Long Yield.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/markets" className="inline-flex min-h-[42px] items-center border border-ice/50 bg-ice/10 px-5 text-[14px] text-ice transition-colors hover:bg-ice/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
                  Browse markets
                </Link>
                <Link href="/portfolio" className="inline-flex min-h-[42px] items-center border border-white/16 px-5 text-[14px] text-muted transition-colors hover:border-white/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
                  View portfolio
                </Link>
              </div>
            </header>

            <div className="mb-8 flex gap-2 overflow-x-auto border-b border-white/10 pb-3 lg:hidden" aria-label="Guide sections">
              {sections.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="mono shrink-0 text-[10px] uppercase tracking-[0.1em] text-muted-dark hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
                  {label}
                </a>
              ))}
            </div>

            <div className="space-y-14 text-[16px] leading-7 text-muted">
              <section id="start" className="scroll-mt-32">
                <SectionLabel>00 / Start here</SectionLabel>
                <h2>One market. Two ways to read it.</h2>
                <p>
                  A yield market has a principal side and a yield side. CLEAVE separates them into simple positions so you can decide whether you want certainty or exposure to future yield.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <GuideCard tone="ice" title="Fixed Yield" text="Know the rate you are targeting and carry the position to maturity." />
                  <GuideCard tone="amber" title="Long Yield" text="Own the future yield stream and benefit if realized yield stays strong." />
                </div>
              </section>

              <section id="fixed" className="scroll-mt-32">
                <SectionLabel>01 / Fixed Yield</SectionLabel>
                <h2>Know your rate.</h2>
                <p>
                  Fixed Yield is PT-backed exposure. You deposit the quote asset, receive Principal Tokens, and target a known maturity value based on the quoted fixed APY.
                </p>
                <Flow items={["Open position", "Hold or sell early", "Redeem at maturity"]} tone="ice" />
                <p className="mt-5">Selling early returns the position’s current market value. Redeeming is available only once the market reaches maturity.</p>
              </section>

              <section id="long" className="scroll-mt-32">
                <SectionLabel>02 / Long Yield</SectionLabel>
                <h2>Trade future yield.</h2>
                <p>
                  Long Yield gives you Yield Token exposure. YT represents the right to claim the underlying yield stream until maturity; it does not redeem the deposited principal.
                </p>
                <Flow items={["Open position", "Earn the yield stream", "Claim or sell early"]} tone="amber" />
                <p className="mt-5">If the realized rate is below the break-even rate, the position can lose value. At maturity, YT trends toward zero.</p>
              </section>

              <section id="rates" className="scroll-mt-32">
                <SectionLabel>03 / Understanding rates</SectionLabel>
                <h2>Read the numbers before you choose.</h2>
                <dl className="mt-6 divide-y divide-white/10 border-y border-white/10">
                  <Term term="Underlying APY">The current annualized rate produced by the underlying yield source.</Term>
                  <Term term="Implied APY">The annualized rate implied by the market price of principal and yield exposure.</Term>
                  <Term term="Quoted Fixed APY">The rate calculated for the exact amount and maturity in your current Fixed quote.</Term>
                  <Term term="Break-even APY">The average realized rate Long Yield needs for its yield stream to recover the amount paid.</Term>
                </dl>
              </section>

              <section id="maturity" className="scroll-mt-32">
                <SectionLabel>04 / Maturity</SectionLabel>
                <h2>Maturity is where the instruments separate.</h2>
                <p>
                  For PT, maturity is the point at which the principal claim can be redeemed. For YT, the yield claim ends and the token’s value approaches zero. Always check the maturity date before entering a position.
                </p>
              </section>

              <section id="risk" className="scroll-mt-32">
                <SectionLabel>05 / Risk</SectionLabel>
                <h2>Long Yield is a view, not a guarantee.</h2>
                <div className="border-l-2 border-amber bg-amber/5 px-5 py-4 text-muted-light">
                  If realized yield falls below the rate implied by the price you paid, a large portion of Long Yield value can be lost. Review break-even, maturity, liquidity, and price impact before confirming.
                </div>
                <p className="mt-5">Both strategies also carry market, liquidity, protocol, smart-contract, network, and wallet risks.</p>
              </section>

              <section id="wallet" className="scroll-mt-32">
                <SectionLabel>06 / Wallet & network</SectionLabel>
                <h2>Wallet state and market data are separate.</h2>
                <p>
                  CLEAVE uses your connected wallet and network state for account access. Robinhood Chain uses ETH for gas. The app supports Mainnet (4663) and Testnet (46630); switch networks from the trade panel when needed.
                </p>
              </section>

              <section id="preview" className="scroll-mt-32">
                <SectionLabel>07 / Preview vs live</SectionLabel>
                <h2>Know what the app is showing you.</h2>
                <p>
                  This development environment uses the mock adapter. Market list entries, APYs, liquidity, balances, quotes, addresses, and transaction hashes are preview values. They are not verified live protocol data and do not change simply because your wallet is on Mainnet.
                </p>
                <p>When a live adapter is connected, the Preview Data indicator will become Live Data and the source, balances, quotes, and contract addresses must all come from verified production integrations.</p>
              </section>

              <section id="glossary" className="scroll-mt-32">
                <SectionLabel>08 / Glossary</SectionLabel>
                <h2>Words you will see in the app.</h2>
                <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <Term compact term="PT">Principal Token. The principal side of a yield position.</Term>
                  <Term compact term="YT">Yield Token. The future yield stream until maturity.</Term>
                  <Term compact term="Maturity">The date when the position’s rights change.</Term>
                  <Term compact term="Price impact">The estimated effect of your trade size on its quoted price.</Term>
                  <Term compact term="Liquidity">The available market depth for entering or exiting.</Term>
                  <Term compact term="Yield source">The protocol or vault producing the underlying yield.</Term>
                </dl>
              </section>
            </div>
          </article>
        </main>

        <Footer />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mono mb-3 text-[11px] uppercase tracking-[0.18em] text-ice">{children}</div>;
}

function GuideCard({ tone, title, text }: { tone: "ice" | "amber"; title: string; text: string }) {
  return (
    <div className={`border-l-2 px-4 py-4 ${tone === "ice" ? "border-ice bg-ice/5" : "border-amber bg-amber/5"}`}>
      <h3 className="m-0 text-[16px] font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-[14px] leading-6 text-muted">{text}</p>
    </div>
  );
}

function Flow({ items, tone }: { items: string[]; tone: "ice" | "amber" }) {
  return (
    <ol className="mt-6 flex flex-col gap-2 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:gap-0">
      {items.map((item, index) => (
        <li key={item} className="flex items-center gap-2 text-[13px] text-muted-light sm:flex-1">
          <span className={`mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${tone === "ice" ? "border-ice/40 text-ice" : "border-amber/40 text-amber"}`}>
            {index + 1}
          </span>
          <span>{item}</span>
          {index < items.length - 1 && <span className="hidden flex-1 px-3 text-muted-faint sm:block" aria-hidden="true">→</span>}
        </li>
      ))}
    </ol>
  );
}

function Term({ term, children, compact = false }: { term: string; children: ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? "" : "grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-6"}>
      <dt className="font-medium text-foreground">{term}</dt>
      <dd className="m-0 text-[15px] leading-6 text-muted">{children}</dd>
    </div>
  );
}
