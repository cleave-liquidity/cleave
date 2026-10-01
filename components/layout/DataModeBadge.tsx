import type { MarketDataMode } from "@/types/market";

export function DataModeBadge({ mode }: { mode: MarketDataMode }) {
  const isLive = mode === "live";
  return (
    <span
      title={isLive ? "Values are sourced from the live adapter." : "Values are preview data from the mock adapter."}
      className={`mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${
        isLive
          ? "border-positive/30 bg-positive/10 text-positive"
          : "border-amber/30 bg-amber/10 text-amber"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {isLive ? "Live Data" : "Preview Data"}
    </span>
  );
}
