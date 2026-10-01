"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PositionCard } from "@/components/portfolio/PositionCard";
import { usePositions } from "@/hooks/usePositions";
import { formatUsd } from "@/lib/utils/formatters";
import { useAccount } from "wagmi";
import { ArrowRight, Wallet } from "lucide-react";

export default function PortfolioPage() {
  const { address } = useAccount();
  const { positions, isLoading, refresh } = usePositions(address);
  const [filter, setFilter] = useState<"all" | "active" | "matured">("all");

  const totalValue = positions.reduce((acc, p) => acc + p.currentValue, 0);
  const fixedValue = positions
    .filter((p) => p.strategy === "fixed")
    .reduce((acc, p) => acc + p.currentValue, 0);
  const longValue = positions
    .filter((p) => p.strategy === "long")
    .reduce((acc, p) => acc + p.currentValue, 0);
  const totalPnl = positions.reduce((acc, p) => acc + p.pnl, 0);
  const totalClaimable = positions
    .filter((p) => p.strategy === "long")
    .reduce((acc, p) => {
      const longP = p as import("@/types/position").LongYieldPosition;
      return acc + (longP.claimableYield || 0);
    }, 0);

  const filteredPositions = positions.filter((p) => {
    if (filter === "active") return p.status === "active";
    if (filter === "matured")
      return p.status === "matured" || p.status === "redeemed";
    return true;
  });

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <Navbar isLanding={false} />

      <main className="flex-grow max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
        {/* Header */}
        <div className="flex flex-col gap-2 pb-8 border-b border-white/12">
          <div className="mono text-[12px] tracking-[0.18em] text-muted-dark uppercase">
            User Portfolio · Robinhood Chain
          </div>
          <h1 className="text-[36px] sm:text-[44px] font-normal tracking-[-0.03em] m-0 text-foreground">
            Yield Portfolio
          </h1>
          <p className="text-[16px] text-muted max-w-[560px] m-0 font-light">
            Monitor and manage your Fixed and Long yield positions. Claim accrued
            yield, redeem matured positions, or exit early.
          </p>
        </div>

        {/* Top-Level Metrics */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4 p-5 sm:p-6 rounded-[10px] bg-surface border border-white/14">
          <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
            <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
              Total Value
            </span>
            <span className="mono text-[22px] sm:text-[24px] font-medium text-foreground">
              {formatUsd(totalValue)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
              Fixed Yield Value
            </span>
            <span className="mono text-[20px] sm:text-[22px] font-medium text-ice">
              {formatUsd(fixedValue)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
              Long Yield Value
            </span>
            <span className="mono text-[20px] sm:text-[22px] font-medium text-amber">
              {formatUsd(longValue)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
              Unrealized PnL
            </span>
            <span
              className={`mono text-[20px] sm:text-[22px] font-medium ${
                totalPnl >= 0 ? "text-positive" : "text-negative"
              }`}
            >
              {totalPnl >= 0 ? `+${totalPnl.toFixed(2)}` : totalPnl.toFixed(2)} USDG
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="mono text-[11px] text-muted-dark uppercase tracking-wider">
              Claimable Yield
            </span>
            <span className="mono text-[20px] sm:text-[22px] font-medium text-amber">
              {totalClaimable.toFixed(2)} USDG
            </span>
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="mt-10 flex items-center justify-between gap-4 border-b border-white/12 pb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-[14px] rounded-lg transition-colors ${
                filter === "all"
                  ? "bg-surface-raised border border-white/20 text-foreground font-medium"
                  : "text-muted hover:text-white"
              }`}
            >
              All Positions ({positions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("active")}
              className={`px-4 py-2 text-[14px] rounded-lg transition-colors ${
                filter === "active"
                  ? "bg-surface-raised border border-white/20 text-foreground font-medium"
                  : "text-muted hover:text-white"
              }`}
            >
              Active (
              {positions.filter((p) => p.status === "active").length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("matured")}
              className={`px-4 py-2 text-[14px] rounded-lg transition-colors ${
                filter === "matured"
                  ? "bg-surface-raised border border-white/20 text-foreground font-medium"
                  : "text-muted hover:text-white"
              }`}
            >
              Matured (
              {
                positions.filter(
                  (p) => p.status === "matured" || p.status === "redeemed"
                ).length
              }
              )
            </button>
          </div>

          <Link
            href="/markets"
            className="inline-flex items-center gap-1.5 text-[14px] text-ice hover:underline"
          >
            <span>Explore new markets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Positions List */}
        <div className="mt-6 flex flex-col gap-4">
          {isLoading ? (
            <div className="py-20 text-center font-mono text-muted">
              Loading your positions...
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="border border-white/12 rounded-[10px] bg-surface p-12 text-center flex flex-col items-center gap-4">
              <Wallet className="w-10 h-10 text-muted-dark" />
              <div className="flex flex-col gap-1">
                <h3 className="text-[18px] font-normal text-foreground m-0">
                  No positions found
                </h3>
                <p className="text-[14px] text-muted m-0">
                  You don&apos;t have any {filter !== "all" ? filter : ""} positions
                  yet.
                </p>
              </div>
              <Link
                href="/markets"
                className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-background font-medium rounded-lg text-[14px] hover:bg-white transition-colors"
              >
                <span>Browse Markets</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            filteredPositions.map((pos) => (
              <PositionCard
                key={pos.id}
                position={pos}
                onActionComplete={refresh}
              />
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
