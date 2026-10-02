"use client";

import type { MarketDataMode } from "@/types/market";

export function DataModeBadge({ mode }: { mode: MarketDataMode }) {
  const isLive = mode === "live";

  return (
    <span
      title={
        isLive
          ? "Values are sourced from the verified live protocol adapter."
          : "Values are preview data from the mock yield adapter."
      }
      className={`mono inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-medium tracking-[0.08em] uppercase whitespace-nowrap transition-all select-none border ${
        isLive
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
          : "border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.12)]"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isLive
            ? "bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"
            : "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
        }`}
        aria-hidden="true"
      />
      <span>{isLive ? "Live Network Data" : "Preview Data"}</span>
    </span>
  );
}
