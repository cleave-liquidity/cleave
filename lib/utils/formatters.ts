import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { YieldMarket } from "@/types/market";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatApy(apy: number | null | undefined, includePercent = true): string {
  if (apy === null || apy === undefined || !Number.isFinite(apy)) return "—";
  const formatted = apy.toFixed(2);
  return includePercent ? `${formatted}%` : formatted;
}

export function formatUsd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type MarketMetric = "underlyingApy" | "impliedApy" | "liquidityUsd";

function hasVerifiedMetric(market: YieldMarket, metric: MarketMetric): boolean {
  return market.metricAvailability?.[metric] !== "unavailable" &&
    market.metricAvailability?.[metric] !== "not-applicable";
}

export function formatMarketApy(market: YieldMarket, metric: "underlyingApy" | "impliedApy"): string {
  return hasVerifiedMetric(market, metric) ? formatApy(market[metric]) : "—";
}

export function formatMarketUsd(market: YieldMarket): string {
  return hasVerifiedMetric(market, "liquidityUsd") ? formatUsd(market.liquidityUsd) : "—";
}

/** Price impact is a small raw float from the quote; show it at a readable precision. */
export function formatPriceImpact(impact: number): string {
  if (!Number.isFinite(impact)) return "—";
  const magnitude = Math.abs(impact);
  if (magnitude === 0) return "0.00%";
  if (magnitude < 0.01) return "<0.01%";
  return `${impact.toFixed(2)}%`;
}

/** ETH network fee estimate with a readable precision (raw values carry 15+ decimals). */
export function formatNetworkFee(fee: number): string {
  if (!Number.isFinite(fee)) return "—";
  if (fee === 0) return "0 ETH";
  if (fee < 0.000001) return "<0.000001 ETH";
  return `~${fee.toFixed(6)} ETH`;
}

/** Keep small positive native balances visible instead of rounding them to zero. */
export function formatNativeBalance(balance: number): string {
  if (!Number.isFinite(balance)) return "—";
  if (balance === 0) return "0";
  if (balance > 0 && balance < 0.000001) return "<0.000001";
  return balance.toFixed(6).replace(/\.?(0+)$/, "").replace(/\.$/, "");
}

export function formatTokenAmount(amount: number, decimals = 2): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function truncateAddress(address?: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
