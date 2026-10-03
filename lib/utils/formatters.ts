import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatApy(apy: number, includePercent = true): string {
  const formatted = apy.toFixed(2);
  return includePercent ? `${formatted}%` : formatted;
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

export function formatUsd(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
