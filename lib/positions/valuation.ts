import { FixedYieldPosition, LongYieldPosition, YieldPosition } from "@/types/position";
import { getTimeToMaturity } from "@/lib/markets/status";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function timestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function progressBetween(openedAt: string, maturityDate: string, now: number): number {
  const start = timestamp(openedAt);
  const end = timestamp(maturityDate);
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

export function isMatured(maturityDate: string, now = Date.now()): boolean {
  return getTimeToMaturity(maturityDate, now).milliseconds === 0;
}

export function canRedeemFixed(position: YieldPosition, now = Date.now()): boolean {
  return position.strategy === "fixed" && position.status === "matured" ||
    position.strategy === "fixed" && position.status === "active" && isMatured(position.maturityDate, now);
}

export function canSellPosition(position: YieldPosition): boolean {
  return position.status === "active" && (position.strategy === "fixed" || position.strategy === "long");
}

export function canClaimYield(position: YieldPosition): boolean {
  return position.strategy === "long" &&
    (position.status === "active" || position.status === "matured") &&
    position.claimableYield > 0;
}

export function getFixedCurrentValue(position: FixedYieldPosition, now = Date.now()): number {
  if (position.status === "redeemed" || position.status === "closed") return 0;
  const progress = progressBetween(position.openedAt, position.maturityDate, now);
  return position.depositedAmount + (position.ptAmount - position.depositedAmount) * progress;
}

export function getLongCurrentValue(position: LongYieldPosition, now = Date.now()): number {
  if (position.status === "closed") return 0;
  const remaining = 1 - progressBetween(position.openedAt, position.maturityDate, now);
  return position.depositedAmount * Math.max(0, remaining);
}

export function getClaimableYield(position: LongYieldPosition, now = Date.now()): number {
  if (position.status === "closed") return 0;
  const start = timestamp(position.lastClaimedAt || position.openedAt);
  const end = timestamp(position.maturityDate);
  const accrualEnd = Math.min(now, end);
  const elapsed = Math.max(0, accrualEnd - start);
  const accrued = position.ytAmount * (position.currentUnderlyingApy / 100) * (elapsed / YEAR_MS);
  return Math.max(position.claimableYield, accrued);
}

export function refreshPositionValuation(position: YieldPosition, now = Date.now()): YieldPosition {
  if (position.strategy === "fixed") {
    const matured = isMatured(position.maturityDate, now);
    const status = position.status === "active" && matured ? "matured" : position.status;
    const currentValue = getFixedCurrentValue({ ...position, status }, now);
    return {
      ...position,
      status,
      currentValue,
      pnl: currentValue - position.depositedAmount,
    };
  }

  const matured = isMatured(position.maturityDate, now);
  const status = position.status === "active" && matured ? "matured" : position.status;
  const refreshed = { ...position, status };
  const claimableYield = getClaimableYield(refreshed, now);
  const currentValue = getLongCurrentValue(refreshed, now);
  return {
    ...refreshed,
    claimableYield,
    currentValue,
    pnl: currentValue + claimableYield - position.depositedAmount,
  };
}
