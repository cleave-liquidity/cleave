import type { YieldMarket } from "@/types/market";

const MS_PER_DAY = 86_400_000;

export type YieldSplitDemoMarket = Pick<
  YieldMarket,
  "symbol" | "name" | "impliedApy" | "maturityDate"
> & {
  referenceDate: string;
  underlyingAmount: number;
  initialPtPrice: number;
  timelineDayOffsets: readonly number[];
  dateDisplaySnapThreshold: number;
  fullZipProgressThreshold: number;
};

export const yieldSplitDemoMarket = {
  symbol: "USDG",
  name: "USDG Lending Vault",
  impliedApy: 6.42,
  maturityDate: "2027-03-26T00:00:00.000Z",
  referenceDate: "2026-10-02T00:00:00.000Z",
  underlyingAmount: 1,
  initialPtPrice: 0.941,
  // These offsets preserve the educational monthly checkpoints while their
  // displayed dates remain derived from the reference and maturity dates.
  timelineDayOffsets: [0, 44, 74, 105, 136, 159],
  dateDisplaySnapThreshold: 0.02,
  fullZipProgressThreshold: 0.98,
} satisfies YieldSplitDemoMarket;

export interface YieldSplitTimelineMilestone {
  label: string;
  date: string;
  offsetDays: number;
}

export interface YieldSplitSimulation {
  currentDate: string;
  daysLeft: number;
  daysElapsed: number;
  currentPtPrice: number;
  yieldStreamed: number;
  yieldPaidPercentage: number;
  yieldAtMaturity: number;
  leverage: number;
  isFullZipped: boolean;
}

function parseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid demo date: ${value}`);
  }
  return date;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .toUpperCase();
}

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(1, progress));
}

function round(value: number, decimals = 6): number {
  return Number(value.toFixed(decimals));
}

export function getDaysToMaturity(
  referenceDate: string,
  maturityDate: string,
): number {
  const reference = parseDate(referenceDate);
  const maturity = parseDate(maturityDate);
  return Math.max(0, Math.round((maturity.getTime() - reference.getTime()) / MS_PER_DAY));
}

export function getTimelineMilestones(
  market: YieldSplitDemoMarket,
): YieldSplitTimelineMilestone[] {
  const daysToMaturity = getDaysToMaturity(
    market.referenceDate,
    market.maturityDate,
  );
  const offsets = [...market.timelineDayOffsets, daysToMaturity];
  const reference = parseDate(market.referenceDate);

  return offsets.map((offsetDays, index) => {
    const date = addDays(reference, Math.min(offsetDays, daysToMaturity));
    const isFirst = index === 0;
    const isLast = index === offsets.length - 1;

    return {
      offsetDays: Math.min(offsetDays, daysToMaturity),
      label: isFirst ? "TODAY" : isLast ? "MATURITY" : formatMonthLabel(date),
      date: formatDate(date),
    };
  });
}

export function getPtPriceAtProgress(
  market: YieldSplitDemoMarket,
  progress: number,
): number {
  const normalizedProgress = clampProgress(progress);
  return round(
    market.initialPtPrice +
    normalizedProgress * (market.underlyingAmount - market.initialPtPrice)
  );
}

export function getYieldStreamedAtProgress(
  market: YieldSplitDemoMarket,
  progress: number,
): number {
  return round(
    clampProgress(progress) *
      (market.underlyingAmount - market.initialPtPrice),
  );
}

export function getYieldSplitSimulation(
  market: YieldSplitDemoMarket,
  progress: number,
): YieldSplitSimulation {
  const normalizedProgress = clampProgress(progress);
  const daysToMaturity = getDaysToMaturity(
    market.referenceDate,
    market.maturityDate,
  );
  const daysLeft = Math.round(daysToMaturity * (1 - normalizedProgress));
  const yieldAtMaturity = getYieldStreamedAtProgress(market, 1);
  const currentDateOffset =
    normalizedProgress <= market.dateDisplaySnapThreshold
      ? 0
      : normalizedProgress >= market.fullZipProgressThreshold
        ? daysToMaturity
        : Math.round(normalizedProgress * daysToMaturity);

  return {
    currentDate: formatDate(
      addDays(parseDate(market.referenceDate), currentDateOffset),
    ),
    daysLeft,
    daysElapsed: daysToMaturity - daysLeft,
    currentPtPrice: getPtPriceAtProgress(market, normalizedProgress),
    yieldStreamed: getYieldStreamedAtProgress(market, normalizedProgress),
    yieldPaidPercentage: normalizedProgress * 100,
    yieldAtMaturity,
    leverage: market.underlyingAmount / yieldAtMaturity,
    isFullZipped: normalizedProgress >= market.fullZipProgressThreshold,
  };
}
