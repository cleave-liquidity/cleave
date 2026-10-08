"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { useOptionsPositions } from "@/hooks/useOptionsPositions";

function rateLabel(value: bigint): string {
  return `${Number(formatUnits(value, 16)).toFixed(2)}%`;
}

export function OptionsPortfolioPanel() {
  const { positions, configured, connectedAddress, isLoading, error } = useOptionsPositions();

  if (!configured) return null;

  return (
    <section className="mt-8 border border-white/10 bg-surface/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">Testnet development positions</div>
          <h2 className="mt-2 text-[20px] font-normal text-foreground">Yield Rate Options</h2>
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.12em] text-muted-dark">Owner-linked reads only</span>
      </div>
      {!connectedAddress ? <p className="mt-5 text-[12px] leading-5 text-muted-dark">Connect a wallet to read owner-linked Testnet Options positions.</p> : isLoading ? <p className="mt-5 text-[12px] text-muted">Reading option events…</p> : error ? <p className="mt-5 text-[12px] text-negative">Unable to read Testnet option positions.</p> : positions.length === 0 ? <p className="mt-5 text-[12px] leading-5 text-muted-dark">No on-chain Testnet Options positions found for this wallet.</p> : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead className="mono text-[10px] uppercase tracking-[0.12em] text-muted-dark"><tr className="border-b border-white/10"><th className="pb-3 pr-4 font-normal">Option</th><th className="pb-3 pr-4 font-normal">Strike</th><th className="pb-3 pr-4 font-normal">Expiry</th><th className="pb-3 pr-4 font-normal">Premium</th><th className="pb-3 pr-4 font-normal">Status</th><th className="pb-3 font-normal">Action</th></tr></thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.optionId.toString()} className="border-b border-white/[0.06] last:border-0">
                  <td className="py-4 pr-4 font-mono text-foreground">#{position.optionId.toString()} · {position.kind}</td>
                  <td className="py-4 pr-4 font-mono text-amber">{rateLabel(position.strike)}</td>
                  <td className="py-4 pr-4 text-muted">{new Date(Number(position.expiry) * 1000).toLocaleString("en-US")}</td>
                  <td className="py-4 pr-4 font-mono text-muted">{position.premium.toString()}</td>
                  <td className="py-4 pr-4 font-mono text-muted">{position.state}</td>
                  <td className="py-4"><Link href={`/options/testnet-usdg-rate?optionId=${position.optionId.toString()}`} className="text-ice hover:text-white">Inspect →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
