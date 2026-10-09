"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { useYieldRateOptions } from "@/hooks/useYieldRateOptions";

function rateLabel(rate: bigint | undefined): string {
  if (rate === undefined) return "—";
  return `${Number(formatUnits(rate, 16)).toFixed(2)}%`;
}

export function OptionsOverview() {
  const options = useYieldRateOptions();

  if (!options.configured) {
    return (
      <section className="border border-amber/25 bg-amber/[0.04] p-6 sm:p-8">
        <div className="mono text-[10px] uppercase tracking-[0.16em] text-amber">
          Testnet development layer
        </div>
        <h1 className="mt-3 text-[30px] font-normal tracking-[-0.03em] text-foreground sm:text-[40px]">
          Yield Rate Options
        </h1>
        <p className="mt-4 max-w-[680px] text-[14px] leading-6 text-muted">
          The Options contracts are prepared but no verified Robinhood Chain
          Testnet deployment is configured in this environment. No market,
          quote, collateral capacity, or trading success is shown until real
          on-chain addresses are supplied.
        </p>
        <div className="mt-6 grid gap-3 text-[12px] sm:grid-cols-3">
          {[
            ["Rate source", "Not deployed"],
            ["Collateral vault", "Not deployed"],
            ["Execution", "Unavailable"],
          ].map(([label, value]) => (
            <div key={label} className="border border-white/10 bg-white/[0.02] p-4">
              <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">{label}</div>
              <div className="mt-2 text-muted">{value}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="border border-white/15 bg-surface/70 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-amber">Testnet development market</div>
          <h1 className="mt-3 text-[30px] font-normal tracking-[-0.03em] text-foreground sm:text-[40px]">
            Yield Rate Options
          </h1>
          <p className="mt-3 max-w-[660px] text-[14px] leading-6 text-muted">
          The development market offers European CALL and PUT positions for one
          30-day tenor. Its operator-published index is not a verified live yield
          source or production oracle; capacity is limited by funded Testnet collateral.
          </p>
        </div>
        <span className={`mono rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.14em] ${options.readState?.fresh ? "border-positive/30 bg-positive/5 text-positive" : "border-amber/30 bg-amber/5 text-amber"}`}>
          {options.readState?.fresh ? "DEV INDEX · FRESH" : "DEV INDEX · STALE / UNAVAILABLE"}
        </span>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-4">
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Development index rate</div>
          <div className="mt-2 font-mono text-[20px] text-amber">{rateLabel(options.readState?.currentRate)}</div>
        </div>
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Collateral capacity</div>
          <div className="mt-2 font-mono text-[20px] text-foreground">
            {options.readState ? `${options.formatCollateral(options.readState.availableCollateral)} ${options.readState.collateralSymbol}` : "—"}
          </div>
        </div>
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Rate source</div>
          <div className="mt-2 text-[13px] text-muted">{options.readState?.sourceLabel || "Reading…"}</div>
        </div>
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Settlement</div>
          <div className="mt-2 text-[13px] text-muted">After expiry · fresh snapshot required</div>
        </div>
      </div>

      {options.error && <p className="mt-5 text-[12px] text-negative">{options.error}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <p className="m-0 text-[12px] leading-5 text-muted-dark">
          Testnet development only. This is not a Mainnet oracle or production pricing model.
        </p>
        <Link href="/options/testnet-usdg-rate" className="text-[12px] text-ice hover:text-white">
          Open market →
        </Link>
      </div>
    </section>
  );
}
