"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { useOptionsPositions } from "@/hooks/useOptionsPositions";

function rateLabel(value: bigint): string {
  return `${Number(formatUnits(value, 16)).toFixed(2)}%`;
}

function expiryLabel(value: bigint): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Number(value) * 1000)) + " UTC";
}

export function OptionsPortfolioPanel() {
  const { positions, configured, historyConfigured, connectedAddress, isLoading, error } = useOptionsPositions();
  const mainnetStatus = (
    <section className="mt-8 border border-amber/20 bg-amber/[0.025] p-5 sm:p-6">
      <div className="mono text-[10px] uppercase tracking-[0.16em] text-amber">Robinhood Chain Mainnet · Options not live</div>
      <h2 className="mt-2 text-[20px] font-normal text-foreground">Yield Rate Options</h2>
      <p className="mb-0 mt-3 max-w-[720px] text-[12px] leading-5 text-muted-dark">
        No Mainnet Options deployment is configured, so this page cannot read Mainnet Options holdings. Preview calculations are never shown as positions.
      </p>
      <Link href="/options" className="mt-4 inline-block text-[12px] text-ice hover:text-white">View Mainnet product status →</Link>
    </section>
  );

  if (!configured) {
    return (
      <>
      {mainnetStatus}
      <section className="mt-8 border border-white/10 bg-surface/50 p-5 sm:p-6">
        <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">Testnet development preview · not a holding</div>
        <h2 className="mt-2 text-[20px] font-normal text-foreground">Yield Rate Options</h2>
        <p className="mb-0 mt-3 max-w-[720px] text-[12px] leading-5 text-muted-dark">
          No Options deployment is configured for this environment. Preview selections do not create positions, and this panel is not reporting wallet holdings.
        </p>
        <Link href="/options" className="mt-4 inline-block text-[12px] text-ice hover:text-white">Explore the development preview →</Link>
      </section>
      </>
    );
  }

  return (
    <>
    {mainnetStatus}
    <section className="mt-8 border border-white/10 bg-surface/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">Testnet development positions</div>
          <h2 className="mt-2 text-[20px] font-normal text-foreground">Yield Rate Options</h2>
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.12em] text-muted-dark">Owner-linked on-chain reads</span>
      </div>

      {!connectedAddress ? (
        <p className="mt-5 text-[12px] leading-5 text-muted-dark">Connect a wallet to read its Robinhood Testnet Options positions.</p>
      ) : !historyConfigured ? (
        <p className="mt-5 text-[12px] leading-5 text-amber">Position history is unavailable because the deployment start block is not configured. No empty-position result is inferred.</p>
      ) : isLoading ? (
        <p className="mt-5 text-[12px] text-muted">Reading option events and current contract state…</p>
      ) : error ? (
        <p className="mt-5 text-[12px] text-negative">Unable to read Testnet Options positions from RPC. No mock positions are shown.</p>
      ) : positions.length === 0 ? (
        <p className="mt-5 text-[12px] leading-5 text-muted-dark">No on-chain Testnet Options positions found for this wallet.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[12px]">
            <thead className="mono text-[10px] uppercase tracking-[0.12em] text-muted-dark">
              <tr className="border-b border-white/10">
                <th className="pb-3 pr-4 font-normal">Option</th>
                <th className="pb-3 pr-4 font-normal">Strike</th>
                <th className="pb-3 pr-4 font-normal">Expiry</th>
                <th className="pb-3 pr-4 font-normal">Premium</th>
                <th className="pb-3 pr-4 font-normal">Status</th>
                <th className="pb-3 font-normal">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.optionId.toString()} className="border-b border-white/[0.06] last:border-0">
                  <td className="py-4 pr-4 font-mono text-foreground">#{position.optionId.toString()} · {position.kind}</td>
                  <td className="py-4 pr-4 font-mono text-amber">{rateLabel(position.strike)}</td>
                  <td className="py-4 pr-4 text-muted">{expiryLabel(position.expiry)}</td>
                  <td className="py-4 pr-4 font-mono text-muted">{formatUnits(position.premium, position.collateralDecimals)} yDEVUSD</td>
                  <td className="py-4 pr-4 font-mono text-muted">{position.state}</td>
                  <td className="py-4"><Link href={`/options/testnet-usdg-rate?optionId=${position.optionId.toString()}`} className="text-ice hover:text-white">Inspect →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
    </>
  );
}
