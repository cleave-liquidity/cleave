import type { FixedYieldPosition } from "@/types/position";
import { formatApy } from "@/lib/utils/formatters";

export function formatPositionDate(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatPositionTokenAmount(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function formatPositionPnl(pnl: number, available: boolean): string {
  if (!available || !Number.isFinite(pnl)) return "—";
  const absolute = Math.abs(pnl).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (pnl > 0) return `+$${absolute}`;
  if (pnl < 0) return `-$${absolute}`;
  return "$0.00";
}

export function getFixedApyPresentation(position: Pick<FixedYieldPosition, "entryDataAvailable" | "quotedFixedApy" | "entryImpliedApy">) {
  if (position.entryDataAvailable !== false && Number.isFinite(position.quotedFixedApy)) {
    return { label: "Quoted APY", value: formatApy(position.quotedFixedApy) };
  }

  if (Number.isFinite(position.entryImpliedApy)) {
    return { label: "Current implied APY", value: formatApy(position.entryImpliedApy) };
  }

  return { label: "Entry APY", value: "—" };
}
