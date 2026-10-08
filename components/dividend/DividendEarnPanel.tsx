"use client";

import React from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import { toast } from "sonner";
import type { LongYieldPosition } from "@/types/position";
import type { YieldMarket } from "@/types/market";
import {
  isDividendEarnMarket,
  NVDA_DIVIDEND_EVENT_DATE,
  NVDA_DIVIDEND_EVENT_RATE,
} from "@/lib/dividend/dividend-config";
import { useDividendEarn } from "@/hooks/useDividendEarn";

type DividendPanelProps = {
  market: Pick<YieldMarket, "id" | "underlyingTokenAddress">;
  position?: LongYieldPosition;
  compact?: boolean;
};

type DividendPanelStatus = "UNAVAILABLE" | "ELIGIBLE" | "ACTIVE" | "PENDING";

function statusFromChain(value: number | undefined): DividendPanelStatus {
  if (value === 1) return "ELIGIBLE";
  if (value === 2) return "ACTIVE";
  if (value === 3 || value === 4) return "PENDING";
  return "UNAVAILABLE";
}

function statusClass(status: DividendPanelStatus): string {
  if (status === "ACTIVE") return "border-positive/30 bg-positive/5 text-positive";
  if (status === "PENDING") return "border-amber/30 bg-amber/5 text-amber";
  if (status === "ELIGIBLE") return "border-amber/30 bg-amber/5 text-amber";
  return "border-white/15 bg-surface text-muted";
}

export function DividendEarnPanel({
  market,
  position,
  compact = false,
}: DividendPanelProps) {
  const isSupportedMarket = isDividendEarnMarket(market);
  const hasPosition = Boolean(
    position && position.status !== "closed" && position.ytAmount > 0,
  );
  const dividend = useDividendEarn(hasPosition ? position : undefined);

  if (!isSupportedMarket) return null;

  const onChainStatus = statusFromChain(dividend.state?.status);
  const status: DividendPanelStatus = !hasPosition
    ? "ELIGIBLE"
    : dividend.state
      ? onChainStatus
      : dividend.configured
        ? "PENDING"
        : "ELIGIBLE";
  const accrued = dividend.state
    ? formatUnits(dividend.state.accruedBaseUnits, 6)
    : "0.000000";
  const settlement = dividend.state?.settlementEnabled
    ? "Enabled"
    : dividend.state?.enabled
      ? "Pending"
      : "Not enabled";
  const canEnable = Boolean(
    hasPosition &&
      dividend.configured &&
      dividend.registered &&
      dividend.state?.eligible &&
      !dividend.state.enabled,
  );

  const handleEnable = async () => {
    try {
      await dividend.enable();
      toast.success("Dividend Earn enabled for this Trading Yield position.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to enable Dividend Earn for this position.",
      );
    }
  };

  const action = canEnable ? (
    <button
      type="button"
      onClick={handleEnable}
      disabled={dividend.isPending}
      className="inline-flex h-9 items-center justify-center rounded-md border border-amber/40 px-3 text-[11px] font-medium text-amber transition-colors hover:border-amber hover:bg-amber/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {dividend.isPending ? "Enabling…" : "Enable Dividend Earn"}
    </button>
  ) : null;

  if (compact) {
    return (
      <div className="w-full rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="mono text-[10px] uppercase tracking-[0.12em] text-muted-dark">
            Dividend Earn
          </span>
          <span
            className={`mono text-[10px] ${status === "ACTIVE" ? "text-positive" : status === "PENDING" || status === "ELIGIBLE" ? "text-amber" : "text-muted"}`}
          >
            {status}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-muted-dark">
          {hasPosition
            ? dividend.state
              ? `Accrued ${accrued} USD · Settlement ${settlement.toLowerCase()}`
              : dividend.configured
                ? "Position registration pending"
                : "Registry configuration pending"
            : "Active Trading Yield position required"}
        </div>
        {action && <div className="mt-2 flex justify-end">{action}</div>}
      </div>
    );
  }

  return (
    <section
      className="border border-white/15 bg-surface/70 p-5 sm:p-6"
      aria-labelledby="dividend-earn-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">
            Trading Yield enhancement
          </div>
          <h2
            id="dividend-earn-title"
            className="mt-2 text-[20px] font-normal text-foreground"
          >
            Dividend Earn
          </h2>
        </div>
        <span
          className={`mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${statusClass(status)}`}
        >
          {status}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 border-y border-white/10 py-4 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="text-muted-dark">Underlying asset</dt>
          <dd className="mt-1 font-mono text-foreground">NVDA</dd>
        </div>
        <div>
          <dt className="text-muted-dark">Dividend type</dt>
          <dd className="mt-1 font-mono text-foreground">Cash Dividend</dd>
        </div>
        <div>
          <dt className="text-muted-dark">Source</dt>
          <dd className="mt-1 font-mono text-foreground">
            Robinhood Corporate Actions
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Latest distribution</dt>
          <dd className="mt-1 font-mono text-amber">
            {NVDA_DIVIDEND_EVENT_RATE} USD / share · {NVDA_DIVIDEND_EVENT_DATE}
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Accrued</dt>
          <dd className="mt-1 font-mono text-foreground">
            {hasPosition ? `${accrued} USD` : "Position required"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Settlement</dt>
          <dd className="mt-1 font-mono text-muted">{settlement}</dd>
        </div>
        <div>
          <dt className="text-muted-dark">Latest event</dt>
          <dd className="mt-1 break-all font-mono text-muted">
            {dividend.state?.lastEventId || "Read-only source event"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 max-w-[620px] text-[12px] leading-5 text-muted-dark">
          {hasPosition
            ? dividend.state
              ? "This position is tracked by the YELTRA Dividend Registry. Settlement remains pending until a funded reward module is enabled."
              : dividend.configured
                ? "The active Trading Yield position is eligible, but its on-chain Dividend Registry registration is still pending."
                : "Dividend Earn is ready for this position, but the network deployment is not configured in this environment."
            : "Dividend Earn is position-based and requires an active Trading Yield position before explicit opt-in is available."}
          {" "}No production claim transaction is available.
        </p>
        {action}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-amber">
            Development canary
          </div>
          <p className="mt-1 m-0 text-[12px] leading-5 text-muted-dark">
            Inspect the live Testnet Dividend Earn state separately from your
            Trading Yield position.
          </p>
        </div>
        <Link
          href="/dividend/canary"
          className="whitespace-nowrap text-[12px] text-ice transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice"
        >
          Open canary inspection →
        </Link>
      </div>
    </section>
  );
}
