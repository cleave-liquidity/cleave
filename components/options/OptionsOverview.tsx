import Link from "next/link";

export function OptionsOverview() {
  return (
    <section className="border border-white/15 bg-surface/70 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-amber">
            Robinhood Chain Mainnet · product preview
          </div>
          <h1 className="mt-3 text-[30px] font-normal tracking-[-0.03em] text-foreground sm:text-[40px]">
            Yield Rate Options
          </h1>
          <p className="mt-4 max-w-[700px] text-[14px] leading-6 text-muted">
            Explore European CALL and PUT terms. Mainnet trading is not live: no
            production Options contracts, selected underlying, approved rate
            oracle, or settlement methodology is configured. Nothing on this
            page is an executable quote or position.
          </p>
        </div>
        <span className="mono rounded-full border border-amber/30 bg-amber/5 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-amber">
          MAINNET · NOT LIVE
        </span>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {[
          ["Production rate source", "Not selected / verified"],
          ["Collateral asset", "Not configured"],
          ["Mainnet execution", "Disabled"],
        ].map(([label, value]) => (
          <div key={label} className="border border-white/10 bg-white/[0.02] p-4">
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">{label}</div>
            <div className="mt-2 text-[13px] text-amber">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
        <p className="m-0 max-w-[620px] text-[12px] leading-5 text-muted-dark">
          The interactive preview uses explicitly illustrative assumptions only.
          It creates no contract quote, wallet transaction, or Portfolio holding.
        </p>
        <Link href="/options/robinhood-mainnet-preview" className="inline-flex h-10 items-center rounded-md border border-amber/40 px-4 text-[12px] text-amber hover:bg-amber/10">
          Explore Mainnet preview →
        </Link>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4 text-[11px] text-muted-dark">
        A separate Testnet development deployment exists; it is not the Mainnet product or its oracle.
        <Link href="/options/testnet-usdg-rate" className="ml-2 text-ice hover:text-white">Open Testnet development view →</Link>
      </div>
    </section>
  );
}
