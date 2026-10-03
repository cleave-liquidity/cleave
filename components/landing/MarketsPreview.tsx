"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { DataModeBadge } from "@/components/layout/DataModeBadge";
import { AssetIcon } from "@/components/markets/AssetIcon";
import { useMarkets } from "@/hooks/useMarkets";
import { formatApy, formatUsd } from "@/lib/utils/formatters";
import type { YieldMarket } from "@/types/market";
import { pickPreviewMarkets } from "./featuredMarket";

const ROWS = 3;
const COLS = "grid-cols-[2.1fr_1.5fr_1fr_1fr_1.25fr_1fr_1.1fr]";

// Status dot colours match the markets page.
const statusColor = (m: YieldMarket) => (m.status === "maturing" ? "#F0A85C" : "#A9C8EE");
const statusLabel = (m: YieldMarket) => (m.status === "maturing" ? "Maturing soon" : "Active");

/** Market rows come from the normalized market list (mock or live) — nothing here is hardcoded. */
export function MarketsPreview() {
  const { markets, isLoading, error } = useMarkets();
  const rows = useMemo(() => pickPreviewMarkets(markets, ROWS), [markets]);
  const dataMode = markets[0]?.dataMode;

  return (
    <section
      id="markets"
      className="relative max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-32 lg:pt-40"
    >
      <div data-reveal className="flex justify-between items-end gap-6 flex-wrap">
        <div className="flex flex-col gap-5 sm:gap-6">
          <div className="mono flex items-center gap-2 text-[11px] tracking-[0.22em] text-muted-dark uppercase">
            <span className="w-1 h-1 rounded-full bg-foreground/30 shrink-0" />
            03 — MARKETS
          </div>
          <h2 className="m-0 text-[36px] sm:text-[46px] lg:text-[60px] leading-[1.04] font-normal tracking-[-0.03em]">
            Every market has
            <br />a real yield source.
          </h2>
        </div>
        <div className="flex items-center gap-4 flex-wrap pb-2">
          {dataMode ? (
            <DataModeBadge mode={dataMode} />
          ) : (
            <span className="mono text-[11px] tracking-[0.12em] text-muted border border-white/15 px-2.5 py-1.5">
              {isLoading ? "LOADING MARKETS" : "MARKETS UNAVAILABLE"}
            </span>
          )}
          <Link
            href="/markets"
            className="mono text-[13px] tracking-[0.1em] inline-flex gap-2 items-center min-h-[40px] text-foreground hover:text-white transition-colors"
          >
            All markets <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div data-reveal="1" className="mt-10 overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header */}
          <div className={`mono grid ${COLS} gap-4 px-5 pb-3.5 text-[11px] tracking-[0.14em] text-muted-dark border-b border-white/10`}>
            <span>ASSET</span>
            <span>YIELD SOURCE</span>
            <span className="text-right">IMPLIED APY</span>
            <span className="text-right">RATE NOW</span>
            <span className="text-right">MATURES</span>
            <span className="text-right">LIQUIDITY</span>
            <span className="text-right">STATUS</span>
          </div>

          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/markets/${row.id}`}
              className={`grid ${COLS} gap-4 items-center px-5 py-5 sm:py-6 border-b border-white/10 text-foreground hover:bg-white/[0.025] transition-colors group`}
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <AssetIcon
                  symbol={row.assetMetadata?.symbol ?? row.symbol}
                  name={row.assetMetadata?.name ?? row.name}
                  iconUrl={row.assetMetadata?.iconUrl}
                  size="md"
                />
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[17px] group-hover:text-white transition-colors truncate">
                    {row.assetMetadata?.symbol ?? row.symbol}
                  </span>
                  <span className="mono text-[12px] text-muted-dark truncate">{row.assetMetadata?.name ?? row.name}</span>
                </span>
              </span>

              <span className="text-[14px] text-muted truncate">{row.protocolMetadata?.name ?? row.sourceProtocol ?? row.yieldSource}</span>

              <span className="mono text-right text-[17px] text-ice">{formatApy(row.impliedApy)}</span>

              <span className="mono text-right text-[15px] text-muted">{formatApy(row.underlyingApy)}</span>

              <span className="text-right flex flex-col gap-0.5">
                <span className="text-[14px]">{row.maturity}</span>
                <span className="mono text-[11px] text-muted-dark">{row.daysRemaining} DAYS</span>
              </span>

              <span className="mono text-right text-[14px] text-muted">{formatUsd(row.liquidityUsd)}</span>

              <span className="text-right flex justify-end items-center gap-2 text-[13px] text-muted-light">
                <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: statusColor(row) }} />
                {statusLabel(row)}
              </span>
            </Link>
          ))}

          {rows.length === 0 && (
            <div
              role="status"
              className="flex flex-col items-start gap-3 border-b border-white/10 px-5 py-10 text-[14px] text-muted"
            >
              {isLoading ? (
                <span aria-busy="true">Loading markets…</span>
              ) : (
                <>
                  <span>{error ? "Market data is unavailable right now." : "No open markets yet."}</span>
                  <Link href="/markets" className="mono text-[12px] tracking-[0.08em] text-ice hover:text-white">
                    VIEW ALL MARKETS →
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <p data-reveal="2" className="mono m-0 mt-4 text-[11px] tracking-[0.06em] text-muted-dark">
        Implied APY is the rate the market prices today, before price impact. Rate now is the underlying&apos;s current
        variable rate.
      </p>
    </section>
  );
}
