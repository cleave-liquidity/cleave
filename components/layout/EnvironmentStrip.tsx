"use client";

import { useNetworkGuard } from "@/hooks/useNetworkGuard";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { getNetworkLabel, getNetworkShortLabel } from "@/lib/web3/environment";
import { DataModeBadge } from "@/components/layout/DataModeBadge";

export function EnvironmentStrip() {
  const { chainId, isConnected, status } = useNetworkGuard();
  const isWrongNetwork = status === "unsupported-chain";
  const networkLabel = getNetworkLabel(chainId, isConnected);

  return (
    <div className="border-t border-white/8 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 py-2.5 text-[11px] text-muted-dark">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <span className="mono shrink-0 uppercase tracking-[0.16em] text-muted-faint">
            Network
          </span>
          <span className={`${isWrongNetwork ? "text-negative" : "text-muted"}`}>
            <span className="sm:hidden">{isWrongNetwork ? "Wrong Network" : getNetworkShortLabel(chainId, isConnected)}</span>
            <span className="hidden sm:inline">{networkLabel}</span>
          </span>
          <span className="hidden h-3 w-px bg-white/12 sm:block" aria-hidden="true" />
          <span className="hidden shrink-0 sm:inline">ETH gas</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden mono uppercase tracking-[0.16em] text-muted-faint md:inline">
            Data
          </span>
          <DataModeBadge mode={yieldAdapter.mode} />
          <span className="hidden text-muted-faint lg:inline">
            {isConnected ? getNetworkShortLabel(chainId, true) : "Wallet disconnected"}
          </span>
        </div>
      </div>
    </div>
  );
}
