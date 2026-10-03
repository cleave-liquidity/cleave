"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { YieldMarket } from "@/types/market";
import { formatApy, formatUsd } from "@/lib/utils/formatters";
import { MarketCard } from "./MarketCard";
import { AssetIcon, ProtocolIcon } from "./AssetIcon";
import { Search, ArrowUpDown, ArrowUpRight } from "lucide-react";

type SortField = "impliedApy" | "underlyingApy" | "daysRemaining" | "liquidityUsd";

function sourceDetail(market: YieldMarket): string {
  const source = market.yieldSource;
  const protocol = market.sourceProtocol || market.protocolMetadata?.name;
  if (!protocol) return source;
  return source.replace(new RegExp(`^${protocol}\\s*`, "i"), "") || source;
}

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
        const search = searchTerm.toLowerCase();
        const matchesSearch = [
          market.name,
          market.symbol,
          market.assetMetadata?.name,
          market.assetMetadata?.symbol,
          market.sourceProtocol,
          market.protocolMetadata?.name,
          market.yieldSource,
          market.yieldSourceMetadata?.name,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(search));

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
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Search Input - Zupiter Sleek Glass Style */}
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
            className="w-full bg-[#090A0D] border border-white/12 rounded-xl pl-10 pr-4 py-2.5 text-[14px] text-foreground placeholder:text-muted-dark focus:border-ice/50 focus:bg-[#0E1015] outline-none transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* Filter Pills - Segmented Tab Style */}
        <div className="flex items-center gap-1.5 p-1 bg-[#090A0D] border border-white/10 rounded-xl overflow-x-auto self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-white text-[#0A0C10] font-medium shadow-[0_1px_8px_rgba(255,255,255,0.2)]"
                : "text-muted hover:text-white hover:bg-white/[0.04]"
            }`}
            aria-pressed={statusFilter === "all"}
          >
            All Markets
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] transition-all cursor-pointer ${
              statusFilter === "active"
                ? "bg-white text-[#0A0C10] font-medium shadow-[0_1px_8px_rgba(255,255,255,0.2)]"
                : "text-muted hover:text-white hover:bg-white/[0.04]"
            }`}
            aria-pressed={statusFilter === "active"}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("maturing")}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] transition-all cursor-pointer ${
              statusFilter === "maturing"
                ? "bg-white text-[#0A0C10] font-medium shadow-[0_1px_8px_rgba(255,255,255,0.2)]"
                : "text-muted hover:text-white hover:bg-white/[0.04]"
            }`}
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

      {/* Desktop Financial Table View - Zupiter Sleek Rounded Table */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-[#07080A]/90 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)] md:block">
        <div className="min-w-[920px]">
          {/* Header Row */}
          <div className="mono grid grid-cols-[2fr_1.5fr_1.1fr_1.1fr_1.3fr_1fr_1.1fr] gap-4 border-b border-white/[0.08] bg-white/[0.02] px-6 py-4 text-[10px] tracking-[0.14em] text-muted-dark select-none">
            <span>ASSET</span>
            <span>YIELD SOURCE</span>
            <button
              type="button"
              onClick={() => handleSort("impliedApy")}
              aria-label="Sort by implied APY"
              className="flex items-center justify-end gap-1.5 hover:text-white transition-colors cursor-pointer text-right"
            >
              <span>IMPLIED APY</span>
              <ArrowUpDown className="w-3 h-3 opacity-60" />
            </button>
            <button
              type="button"
              onClick={() => handleSort("underlyingApy")}
              aria-label="Sort by current rate"
              className="flex items-center justify-end gap-1.5 hover:text-white transition-colors cursor-pointer text-right"
            >
              <span>RATE NOW</span>
              <ArrowUpDown className="w-3 h-3 opacity-60" />
            </button>
            <button
              type="button"
              onClick={() => handleSort("daysRemaining")}
              aria-label="Sort by maturity"
              className="flex items-center justify-end gap-1.5 hover:text-white transition-colors cursor-pointer text-right"
            >
              <span>MATURITY</span>
              <ArrowUpDown className="w-3 h-3 opacity-60" />
            </button>
            <button
              type="button"
              onClick={() => handleSort("liquidityUsd")}
              aria-label="Sort by liquidity"
              className="flex items-center justify-end gap-1.5 hover:text-white transition-colors cursor-pointer text-right"
            >
              <span>LIQUIDITY</span>
              <ArrowUpDown className="w-3 h-3 opacity-60" />
            </button>
            <span className="text-right">STATUS</span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-white/[0.05]">
            {filteredAndSortedMarkets.length === 0 ? (
              <div className="py-20 text-center text-muted font-mono text-[13px]">
                No yield markets found matching your filters.
              </div>
            ) : (
              filteredAndSortedMarkets.map((market) => {
                const isMaturing = market.status === "maturing";

                return (
                  <Link
                    key={market.id}
                    href={`/markets/${market.id}`}
                    className="group relative grid grid-cols-[2fr_1.5fr_1.1fr_1.1fr_1.3fr_1fr_1.1fr] items-center gap-4 px-6 py-5 text-foreground transition-all duration-150 hover:bg-white/[0.035] focus-visible:outline-none"
                  >
                    {/* Hover indicator left line */}
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-ice opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Asset Name & Icon */}
                    <span className="flex items-center gap-3.5 min-w-0">
                      <AssetIcon
                        symbol={market.assetMetadata?.symbol || market.symbol}
                        name={market.assetMetadata?.name || market.name}
                        iconUrl={market.assetMetadata?.iconUrl}
                        size="sm"
                      />
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[16px] font-medium group-hover:text-white transition-colors truncate">
                          {market.assetMetadata?.symbol || market.symbol}
                        </span>
                        <span className="text-[12px] text-muted-dark truncate">
                          {market.assetMetadata?.name || market.name}
                        </span>
                      </span>
                    </span>

                    {/* Protocol / Yield Source */}
                    <span className="flex items-center gap-2 min-w-0">
                      <ProtocolIcon
                        name={market.yieldSourceMetadata?.name || market.sourceProtocol || market.protocolMetadata?.name || market.yieldSource}
                        iconUrl={market.yieldSourceMetadata?.iconUrl || market.protocolMetadata?.iconUrl}
                        size="sm"
                      />
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[14px] text-muted-light truncate">
                          {market.sourceProtocol || market.protocolMetadata?.name || market.yieldSource}
                        </span>
                        <span className="text-[11px] text-muted-dark truncate">
                          {sourceDetail(market)}
                        </span>
                      </span>
                    </span>

                    {/* Implied APY */}
                    <span className="mono text-right text-[16px] font-medium text-ice">
                      {formatApy(market.impliedApy)}
                    </span>

                    {/* Rate Now */}
                    <span className="mono text-right text-[14px] text-muted">
                      {formatApy(market.underlyingApy)}
                    </span>

                    {/* Maturity */}
                    <span className="text-right flex flex-col gap-0.5">
                      <span className="text-[13px] text-foreground">
                        {new Date(market.maturityDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="mono text-[11px] text-muted-dark">
                        {market.daysRemaining} DAYS
                      </span>
                    </span>

                    {/* Liquidity */}
                    <span className="mono text-right text-[14px] text-muted-light">
                      {formatUsd(market.liquidityUsd)}
                    </span>

                    {/* Status Pill */}
                    <span className="text-right flex justify-end items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium mono border ${
                          isMaturing
                            ? "bg-amber/10 border-amber/30 text-amber"
                            : "bg-ice/10 border-ice/30 text-ice"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isMaturing ? "bg-amber shadow-[0_0_6px_#F0A85C]" : "bg-ice shadow-[0_0_6px_#A9C8EE]"
                          }`}
                        />
                        {isMaturing ? "Maturing" : "Active"}
                      </span>
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
