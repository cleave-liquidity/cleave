import { MarketStatus, YieldMarket } from "@/types/market";

const DAY_MS = 24 * 60 * 60 * 1000;
const MATURING_THRESHOLD_DAYS = 30;

export function getTimeToMaturity(maturityDate: string, now = Date.now()): {
  milliseconds: number;
  days: number;
} {
  const maturity = new Date(maturityDate).getTime();
  if (!Number.isFinite(maturity)) return { milliseconds: 0, days: 0 };
  const milliseconds = Math.max(0, maturity - now);
  return { milliseconds, days: Math.ceil(milliseconds / DAY_MS) };
}

export function isMarketMatured(market: Pick<YieldMarket, "maturityDate" | "status" | "maturityType">, now = Date.now()): boolean {
  if (market.maturityType === "open-ended") return false;
  return market.status === "matured" || getTimeToMaturity(market.maturityDate, now).milliseconds === 0;
}

export function getMarketStatus(
  market: Pick<YieldMarket, "maturityDate" | "status" | "daysRemaining"> & Pick<YieldMarket, "maturityType">,
  now = Date.now()
): MarketStatus {
  if (market.status === "paused") return "paused";
  if (market.maturityType === "open-ended") return "active";
  if (isMarketMatured(market, now)) return "matured";
  if (
    market.status === "maturing" ||
    getTimeToMaturity(market.maturityDate, now).days <= MATURING_THRESHOLD_DAYS
  ) {
    return "maturing";
  }
  return "active";
}

export function isMarketTradable(
  market: Pick<YieldMarket, "maturityDate" | "status" | "daysRemaining"> & Pick<YieldMarket, "maturityType">,
  now = Date.now()
): boolean {
  const status = getMarketStatus(market, now);
  return status === "active" || status === "maturing";
}

export function isMarketExecutable(
  market: Pick<YieldMarket, "maturityDate" | "status" | "daysRemaining" | "maturityType" | "execution">,
  now = Date.now(),
): boolean {
  return isMarketTradable(market, now) && market.execution?.enabled !== false;
}
