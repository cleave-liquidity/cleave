"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { YieldMarket } from "@/types/market";
import { formatApy, formatUsd } from "@/lib/utils/formatters";
import { MarketCard } from "./MarketCard";
import { AssetIcon, ProtocolIcon } from "./AssetIcon";
import { Search, ArrowUpDown } from "lucide-react";

type SortField = "impliedApy" | "underlyingApy" | "daysRemaining" | "liquidityUsd";

export function MarketTable({ markets }: { markets: YieldMarket[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("daysRemaining");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "daysRemaining");
    }
  };

  const filteredAndSortedMarkets = useMemo(() => {
    return markets
      .filter((market) => {
        const matchesSearch =
          market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          market.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          market.yieldSource.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" || market.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [markets, searchTerm, statusFilter, sortField, sortAsc]);

  return (
    <div className="flex flex-col gap-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-grow max-w-md">
          <label htmlFor="market-search" className="sr-only">
            Search markets by asset or yield source
          </label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark" />
          <input
            id="market-search"
            type="text"
            placeholder="Search by asset or yield source..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-white/14 rounded-lg pl-10 pr-4 py-2.5 text-[14px] text-foreground placeholder:text-muted-dark focus:border-ice/50 outline-none transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-full text-[13px] border transition-colors ${
              statusFilter === "all"
                ? "bg-foreground text-background border-foreground font-medium"
                : "bg-surface border-white/14 text-muted hover:border-white/30"
            } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice`}
            aria-pressed={statusFilter === "all"}
          >
            All Markets
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3.5 py-1.5 rounded-full text-[13px] border transition-colors ${
              statusFilter === "active"
                ? "bg-foreground text-background border-foreground font-medium"
                : "bg-surface border-white/14 text-muted hover:border-white/30"
            } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice`}
            aria-pressed={statusFilter === "active"}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("maturing")}
            className={`px-3.5 py-1.5 rounded-full text-[13px] border transition-colors ${
              statusFilter === "maturing"
                ? "bg-foreground text-background border-foreground font-medium"
                : "bg-surface border-white/14 text-muted hover:border-white/30"
            } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice`}
            aria-pressed={statusFilter === "maturing"}
          >
            Maturing Soon
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {filteredAndSortedMarkets.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>

      {/* Desktop Financial Table View */}
      <div className="hidden md:block overflow-x-auto border border-white/14 rounded-[10px] bg-surface">
        <div className="min-w-[920px]">
          <div className="mono grid grid-cols-[2fr_1.5fr_1.1fr_1.1fr_1.3fr_1fr_1.1fr] gap-4 px-6 py-4 text-[12px] tracking-[0.12em] text-muted-dark border-b border-white/16 bg-surface-raised/40">
            <span>ASSET</span>
            <span>YIELD SOURCE</span>
              <button
                type="button"
                onClick={() => handleSort("impliedApy")}
                aria-label="Sort by implied APY"
                className="flex items-center justify-end gap-1.5 hover:text-white transition-colors cursor-pointer text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
            >
              <span>IMPLIED APY</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
              <button
                type="button"
                onClick={() => handleSort("underlyingApy")}
                aria-label="Sort by current rate"
                className="flex items-center justify-end gap-1.5 hover:text-white transition-colors cursor-pointer text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
            >
              <span>RATE NOW</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
              <button
                type="button"
                onClick={() => handleSort("daysRemaining")}
                aria-label="Sort by maturity"
                className="flex items-center justify-end gap-1.5 hover:text-white transition-colors cursor-pointer text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
            >
              <span>MATURITY</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
              <button
                type="button"
                onClick={() => handleSort("liquidityUsd")}
                aria-label="Sort by liquidity"
                className="flex items-center justify-end gap-1.5 hover:text-white transition-colors cursor-pointer text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
            >
              <span>LIQUIDITY</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <span className="text-right">STATUS</span>
          </div>

              <div className="divide-y divide-white/10">
            {filteredAndSortedMarkets.length === 0 ? (
              <div className="py-16 text-center text-muted">
                No yield markets found matching your filters.
              </div>
            ) : (
              filteredAndSortedMarkets.map((market) => {
                const isMaturing = market.status === "maturing";

                return (
                  <Link
                    key={market.id}
                    href={`/markets/${market.id}`}
                    className="group relative grid grid-cols-[2fr_1.5fr_1.1fr_1.1fr_1.3fr_1fr_1.1fr] items-center gap-4 border-l border-transparent px-6 py-5 text-foreground transition-colors hover:border-l-ice/60 hover:bg-white/[0.03] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ice"
                  >
                    <span className="flex items-center gap-3.5">
                      <AssetIcon
                        symbol={market.assetMetadata?.symbol || market.symbol}
                        name={market.assetMetadata?.name || market.name}
                        iconUrl={market.assetMetadata?.iconUrl}
                        size="sm"
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[17px] font-medium group-hover:text-white transition-colors">
                          {market.assetMetadata?.symbol || market.symbol}
                        </span>
                        <span className="text-[12px] text-muted-dark">
                          {market.assetMetadata?.name || market.name}
                        </span>
                      </span>
                    </span>

                    <span className="flex min-w-0 items-center gap-2 text-[14px] text-muted truncate">
                      <ProtocolIcon
                        name={market.protocolMetadata?.name || market.sourceProtocol || market.yieldSource}
                        iconUrl={market.protocolMetadata?.iconUrl}
                      />
                      <span className="truncate">{market.yieldSource}</span>
                    </span>

                    <span className="mono text-right text-[17px] text-ice font-medium">
                      {formatApy(market.impliedApy)}
                    </span>

                    <span className="mono text-right text-[15px] text-muted">
                      {formatApy(market.underlyingApy)}
                    </span>

                    <span className="text-right flex flex-col gap-0.5">
                      <span className="text-[14px] text-foreground">
                        {market.maturity}
                      </span>
                      <span className="mono text-[11px] text-muted-dark">
                        {market.daysRemaining} DAYS
                      </span>
                    </span>

                    <span className="mono text-right text-[14px] text-muted">
                      {formatUsd(market.liquidityUsd)}
                    </span>

                    <span className="text-right flex justify-end items-center gap-2 text-[13px] text-muted-light">
                      <span
                        className="w-[7px] h-[7px] rounded-full"
                        style={{
                          background: isMaturing ? "#F0A85C" : "#A9C8EE",
                        }}
                      />
                      <span className="capitalize">{market.status.replace("_", " ")}</span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
