"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PositionCard } from "@/components/portfolio/PositionCard";
import { usePositions } from "@/hooks/usePositions";
import { formatUsd } from "@/lib/utils/formatters";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { getYieldErrorMessage } from "@/types/errors";
import { ArrowRight, Wallet } from "lucide-react";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { DataModeBadge } from "@/components/layout/DataModeBadge";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { positions, isLoading, error, refresh } = usePositions(address);
  const [filter, setFilter] = useState<"all" | "active" | "matured">("all");

  const totalValue = positions.reduce((acc, p) => acc + p.currentValue, 0);
  const fixedValue = positions
    .filter((p) => p.strategy === "fixed")
    .reduce((acc, p) => acc + p.currentValue, 0);
  const longValue = positions
    .filter((p) => p.strategy === "long")
    .reduce((acc, p) => acc + p.currentValue, 0);
  const pnlAvailable = positions.some((p) => p.entryDataAvailable !== false);
  const totalPnl = positions.reduce((acc, p) => acc + (p.entryDataAvailable === false ? 0 : p.pnl), 0);
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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />

        <main id="main-content" className="flex-grow max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/12">
            <div className="flex flex-col gap-2">
              <div className="mono text-[12px] tracking-[0.18em] text-muted-dark uppercase">
                Your Yield Positions · Robinhood Chain
              </div>
              <h1 className="text-[36px] sm:text-[44px] font-normal tracking-[-0.03em] m-0 text-foreground">
                Yield Portfolio
              </h1>
              <p className="text-[16px] text-muted max-w-[560px] m-0 font-light">
                Manage your Fixed Yield and Trading Yield positions. Claim yield, sell
                early, or redeem at maturity.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <DataModeBadge mode={yieldAdapter.mode} />
            </div>
          </div>

          {/* Top-Level Metrics — Zupiter-style info cards */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm flex flex-col gap-1">
              <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">
                Total Value
              </span>
              <span className="mono text-[20px] sm:text-[22px] font-medium text-foreground">
                {formatUsd(totalValue)}
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm flex flex-col gap-1">
              <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">
                Fixed Yield
              </span>
              <span className="mono text-[20px] sm:text-[22px] font-medium text-ice">
                {formatUsd(fixedValue)}
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm flex flex-col gap-1">
              <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">
                Trading Yield
              </span>
              <span className="mono text-[20px] sm:text-[22px] font-medium text-amber">
                {formatUsd(longValue)}
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm flex flex-col gap-1">
              <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">
                Unrealized PnL
              </span>
              <span
                className={`mono text-[20px] sm:text-[22px] font-medium ${
                  totalPnl >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {pnlAvailable
                  ? `${totalPnl >= 0 ? `+${totalPnl.toFixed(2)}` : totalPnl.toFixed(2)} USDG`
                  : "—"}
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm flex flex-col gap-1">
              <span className="mono text-[10px] text-muted-dark uppercase tracking-wider">
                Claimable Yield
              </span>
              <span className="mono text-[20px] sm:text-[22px] font-medium text-amber">
                {totalClaimable.toFixed(2)} USDG
              </span>
            </div>
          </div>

          {/* Filter Navigation & Actions */}
          <div className="mt-8 flex items-center justify-between gap-4 pb-2 flex-wrap">
            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-[#090A0D] border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-white text-[#0A0C10] font-medium shadow-[0_1px_8px_rgba(255,255,255,0.2)]"
                    : "text-muted hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                All Positions ({positions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("active")}
                aria-pressed={filter === "active"}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] transition-all cursor-pointer ${
                  filter === "active"
                    ? "bg-white text-[#0A0C10] font-medium shadow-[0_1px_8px_rgba(255,255,255,0.2)]"
                    : "text-muted hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                Active ({positions.filter((p) => p.status === "active").length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("matured")}
                aria-pressed={filter === "matured"}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] transition-all cursor-pointer ${
                  filter === "matured"
                    ? "bg-white text-[#0A0C10] font-medium shadow-[0_1px_8px_rgba(255,255,255,0.2)]"
                    : "text-muted hover:text-white hover:bg-white/[0.04]"
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
              className="mono text-[12px] tracking-[0.08em] text-ice hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <span>Explore markets</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Positions Container */}
          <div className="mt-6 flex flex-col gap-4">
            {!isConnected ? (
              <div className="border border-white/10 rounded-2xl bg-[#07080A]/90 backdrop-blur-md p-12 sm:p-16 text-center flex flex-col items-center gap-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="w-14 h-14 rounded-2xl border border-white/12 bg-white/[0.04] flex items-center justify-center text-ice shadow-[0_0_24px_rgba(59,134,255,0.12)]">
                  <Wallet className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1 max-w-[420px]">
                  <h3 className="text-[19px] font-medium text-foreground m-0">
                    Connect your wallet to see your positions
                  </h3>
                  <p className="text-[14px] text-muted m-0 font-light leading-relaxed">
                    Your Fixed Yield and Trading Yield positions, claimable yield and maturity status show up here once you connect. Markets and quotes work without a wallet.
                  </p>
                </div>
                <div className="pt-2">
                  <ConnectButton />
                </div>
              </div>
            ) : isLoading ? (
              <div className="py-24 text-center font-mono text-muted text-[13px]">
                Loading your positions…
              </div>
            ) : error ? (
              <div className="py-24 text-center text-negative font-mono text-[13px]">
                {getYieldErrorMessage(error)}
              </div>
            ) : filteredPositions.length === 0 ? (
              <div className="border border-white/10 rounded-2xl bg-[#07080A]/90 backdrop-blur-md p-12 sm:p-16 text-center flex flex-col items-center gap-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="w-14 h-14 rounded-2xl border border-white/12 bg-white/[0.04] flex items-center justify-center text-muted-dark">
                  <Wallet className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1 max-w-[420px]">
                  <h3 className="text-[19px] font-medium text-foreground m-0">
                    No positions yet
                  </h3>
                  <p className="text-[14px] text-muted m-0 font-light leading-relaxed">
                    You don&apos;t have any {filter !== "all" ? filter : ""} positions
                    yet. Open one from a live market with Fixed Yield or Trading Yield.
                  </p>
                </div>
                <Link
                  href="/markets"
                  className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-background font-medium rounded-xl text-[14px] hover:bg-white hover:text-background transition-all shadow-[0_2px_12px_rgba(255,255,255,0.15)]"
                >
                  <span>Explore Markets</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#07080A]/90 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="mono hidden grid-cols-[2fr_1.1fr_1fr_1fr_1fr_1.25fr] gap-4 border-b border-white/[0.08] bg-white/[0.02] px-6 py-4 text-[10px] uppercase tracking-[0.14em] text-muted-dark md:grid">
                  <span>Position</span>
                  <span>Value</span>
                  <span>Entry</span>
                  <span>Current</span>
                  <span>PnL</span>
                  <span className="text-right">Maturity / Action</span>
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {filteredPositions.map((pos) => (
                    <PositionCard
                      key={pos.id}
                      position={pos}
                      onActionComplete={refresh}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
