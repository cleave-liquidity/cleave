import Link from "next/link";

export function OptionsOverview() {
  return (
    <section className="relative overflow-hidden border border-white/15 bg-surface/70 p-5 sm:p-8 lg:p-10">
      <div className="absolute bottom-0 right-0 h-px w-1/3 bg-gradient-to-l from-amber/60 to-transparent" aria-hidden="true" />
      <div className="relative max-w-[780px]">
        <span className="mono inline-flex min-h-8 items-center gap-2 border border-amber/30 bg-amber/[0.04] px-3 text-[9px] uppercase tracking-[0.14em] text-amber">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />
          Product Preview · Mainnet Trading Not Live
        </span>
        <h1 className="mt-6 max-w-[700px] text-[38px] font-normal leading-[1.08] tracking-[-0.045em] text-foreground sm:text-[52px]">
          Express a view on where yield rates are headed.
        </h1>
        <p className="mt-4 max-w-[610px] text-[14px] leading-6 text-muted">
          Explore European CALL and PUT scenarios against a reference rate. Adjust the strike and notional, then compare possible outcomes at expiry.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-white/[0.08] py-4">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-amber"><span aria-hidden="true">↗</span> CALL <span className="font-sans tracking-normal text-muted">rate rises</span></span>
          <span className="hidden h-4 border-l border-white/15 sm:block" aria-hidden="true" />
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-amber"><span aria-hidden="true">↘</span> PUT <span className="font-sans tracking-normal text-muted">rate falls</span></span>
        </div>

        <Link
          href="/options/robinhood-mainnet-preview"
          className="mt-7 inline-flex h-12 min-w-[190px] items-center justify-center gap-4 bg-amber px-5 text-[12px] font-medium text-background transition-colors hover:bg-amber-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ice"
        >
          Explore Options <span aria-hidden="true">↗</span>
        </Link>
        <p className="mb-0 mt-3 text-[10px] text-muted-dark">Interactive calculations only · no Mainnet quote or position</p>
      </div>

      <details className="relative mt-8 border-t border-white/10 pt-4 text-[11px] text-muted-dark">
        <summary className="cursor-pointer list-none text-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">Market status & technical details</summary>
        <p className="mb-0 mt-3 max-w-[920px] leading-5">
          Mainnet Options contracts, a production rate source, realized-rate settlement methodology, collateral, and reviewed production pricing are not configured. Preview values use a fixed reference assumption and deterministic illustrative formula. No wallet transaction, settlement, claim, or Portfolio holding is created. A separate Testnet development environment is available at <Link href="/options/testnet-usdg-rate" className="text-ice underline underline-offset-2 hover:text-white">the Testnet inspection route</Link>.
        </p>
      </details>
    </section>
  );
}
