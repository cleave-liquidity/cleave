import { formatApy, formatUsd } from "@/lib/utils/formatters";
import type { YieldMarket } from "@/types/market";

/** The four headline numbers of a market. Shared by the market detail and trade workspace headers. */
export function MarketMetricsStrip({ market }: { market: YieldMarket }) {
  return (
    <div className="grid grid-cols-2 border-y border-white/15 bg-surface/60 sm:grid-cols-4">
      <Metric label="Implied APY" value={formatApy(market.impliedApy)} note="Market pricing" tone="ice" />
      <Metric label="Rate Now" value={formatApy(market.underlyingApy)} note="Underlying APY" />
      <Metric
        label="Maturity"
        value={market.maturity}
        note={`${market.daysRemaining} DAYS LEFT`}
        noteMono
        compact
      />
      <Metric label="Liquidity" value={formatUsd(market.liquidityUsd)} note="Robinhood Chain" compact />
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  tone = "foreground",
  compact = false,
  noteMono = false,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "foreground" | "ice";
  compact?: boolean;
  noteMono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-4 sm:px-5 sm:py-5 [&:nth-child(even)]:border-l [&:nth-child(even)]:border-white/10 [&:nth-child(n+3)]:border-t [&:nth-child(n+3)]:border-white/10 sm:[&:nth-child(n+3)]:border-t-0 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-white/10">
      <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">{label}</span>
      <span
        className={`mono font-medium ${compact ? "text-[16px] sm:text-[18px]" : "text-[22px] sm:text-[24px]"} ${
          tone === "ice" ? "text-ice" : "text-foreground"
        }`}
      >
        {value}
      </span>
      <span className={`${noteMono ? "mono " : ""}text-[11px] text-muted-dark`}>{note}</span>
    </div>
  );
}
