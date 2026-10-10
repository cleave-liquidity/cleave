import {
  getOptionsBreakevenRate,
  OPTIONS_RATE_SCALE,
  optionsExpiryFrom,
  type OptionsDirection,
} from "./options-economics";

/** A fixed illustrative rate. It is not an oracle value or a live quote. */
export const OPTIONS_DEVELOPMENT_PREVIEW_RATE = BigInt("50000000000000000");
const BASE_PREMIUM_BPS = BigInt(100);
const DISTANCE_PREMIUM_BPS = BigInt(2_500);
const BASIS_POINTS = BigInt(10_000);
const SCENARIO_RATE_MOVE = BigInt("10000000000000000");
const CHART_RATE_MARGIN = BigInt("20000000000000000");
const CHART_RATE_GRID = BigInt("5000000000000000");
const CHART_SAMPLE_INTERVALS = 32;

export type OptionsDevelopmentPreview = {
  kind: OptionsDirection;
  currentRate: bigint;
  strike: bigint;
  notional: bigint;
  premium: bigint;
  maxPayout: bigint;
  breakevenRate: bigint | undefined;
  settlementScenarioRate: bigint;
  settlementScenarioPayout: bigint;
  expiry: bigint;
};

export type OptionsPayoffChartPoint = {
  rate: bigint;
  netProfit: bigint;
};

export type OptionsPayoffChartModel = {
  kind: OptionsDirection;
  strike: bigint;
  breakevenRate: bigint | undefined;
  currentRate: bigint;
  payoutCapRate: bigint | undefined;
  minRate: bigint;
  maxRate: bigint;
  minProfit: bigint;
  maxProfit: bigint;
  points: OptionsPayoffChartPoint[];
};

/** Returns gross collateral payout before premium for an illustrative rate. */
export function calculateOptionsScenarioPayout(
  kind: OptionsDirection,
  strike: bigint,
  notional: bigint,
  settlementRate: bigint,
): bigint {
  if (kind !== "CALL" && kind !== "PUT") throw new Error("Unsupported option direction.");
  if (strike < BigInt(0) || strike > OPTIONS_RATE_SCALE) throw new Error("Strike must be between 0% and 100%.");
  if (settlementRate < BigInt(0) || settlementRate > OPTIONS_RATE_SCALE) throw new Error("Rate must be between 0% and 100%.");
  if (notional <= BigInt(0)) throw new Error("Notional must be greater than zero.");
  const difference = kind === "CALL"
    ? (settlementRate > strike ? settlementRate - strike : BigInt(0))
    : (strike > settlementRate ? strike - settlementRate : BigInt(0));
  const payout = (notional * difference) / OPTIONS_RATE_SCALE;
  return payout > notional ? notional : payout;
}

/** Gross option payout less the premium, in illustrative collateral units. */
export function calculateOptionsNetProfit(
  kind: OptionsDirection,
  strike: bigint,
  notional: bigint,
  premium: bigint,
  settlementRate: bigint,
): bigint {
  if (premium < BigInt(0)) throw new Error("Premium must not be negative.");
  return calculateOptionsScenarioPayout(kind, strike, notional, settlementRate) - premium;
}

/**
 * Builds a local rate domain around the selected trade terms. It only widens
 * to a boundary when a notional-sized payout cap is reachable there.
 */
export function buildOptionsPayoffChartModel(input: {
  kind: OptionsDirection;
  strike: bigint;
  notional: bigint;
  premium: bigint;
  currentRate: bigint;
}): OptionsPayoffChartModel {
  const { kind, strike, notional, premium, currentRate } = input;
  if (currentRate < BigInt(0) || currentRate > OPTIONS_RATE_SCALE) {
    throw new Error("Reference rate must be between 0% and 100%.");
  }
  if (premium < BigInt(0)) throw new Error("Premium must not be negative.");

  const breakevenRate = getOptionsBreakevenRate(kind, strike, premium, notional);
  const possibleCapRate = kind === "CALL" ? strike + OPTIONS_RATE_SCALE : strike - OPTIONS_RATE_SCALE;
  const payoutCapRate = possibleCapRate >= BigInt(0) && possibleCapRate <= OPTIONS_RATE_SCALE
    ? possibleCapRate
    : undefined;
  const anchors = [strike, currentRate, ...(breakevenRate === undefined ? [] : [breakevenRate])];
  if (payoutCapRate !== undefined) anchors.push(payoutCapRate);

  const lowAnchor = anchors.reduce((low, rate) => rate < low ? rate : low, anchors[0]);
  const highAnchor = anchors.reduce((high, rate) => rate > high ? rate : high, anchors[0]);
  const rawMinRate = lowAnchor > CHART_RATE_MARGIN ? lowAnchor - CHART_RATE_MARGIN : BigInt(0);
  const rawMaxRate = highAnchor + CHART_RATE_MARGIN < OPTIONS_RATE_SCALE
    ? highAnchor + CHART_RATE_MARGIN
    : OPTIONS_RATE_SCALE;
  let minRate = (rawMinRate / CHART_RATE_GRID) * CHART_RATE_GRID;
  let maxRate = ((rawMaxRate + CHART_RATE_GRID - BigInt(1)) / CHART_RATE_GRID) * CHART_RATE_GRID;
  if (maxRate > OPTIONS_RATE_SCALE) maxRate = OPTIONS_RATE_SCALE;
  if (maxRate <= minRate) {
    if (maxRate < OPTIONS_RATE_SCALE) maxRate += CHART_RATE_GRID;
    else if (minRate > BigInt(0)) minRate -= CHART_RATE_GRID;
  }

  const rates = new Set<bigint>();
  for (let index = 0; index <= CHART_SAMPLE_INTERVALS; index += 1) {
    rates.add(minRate + ((maxRate - minRate) * BigInt(index)) / BigInt(CHART_SAMPLE_INTERVALS));
  }
  for (const marker of [strike, currentRate, breakevenRate, payoutCapRate]) {
    if (marker !== undefined && marker >= minRate && marker <= maxRate) rates.add(marker);
  }
  const points = [...rates]
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
    .map((rate) => ({
      rate,
      netProfit: calculateOptionsNetProfit(kind, strike, notional, premium, rate),
    }));

  const rawMinProfit = points.reduce((low, point) => point.netProfit < low ? point.netProfit : low, BigInt(0));
  const rawMaxProfit = points.reduce((high, point) => point.netProfit > high ? point.netProfit : high, BigInt(0));
  const profitSpan = rawMaxProfit - rawMinProfit;
  const profitPadding = profitSpan > BigInt(0)
    ? (profitSpan + BigInt(11)) / BigInt(12)
    : (premium > BigInt(0) ? premium / BigInt(12) + BigInt(1) : BigInt(1));

  return {
    kind,
    strike,
    breakevenRate,
    currentRate,
    payoutCapRate,
    minRate,
    maxRate,
    minProfit: rawMinProfit - profitPadding,
    maxProfit: rawMaxProfit + profitPadding,
    points,
  };
}

/**
 * Deterministic, local-only Options preview. Mirrors the Testnet demonstration
 * premium arithmetic but never calls a contract and is never executable.
 */
export function calculateOptionsDevelopmentPreview(input: {
  kind: OptionsDirection;
  strike: bigint;
  notional: bigint;
  nowSeconds: bigint;
}): OptionsDevelopmentPreview {
  const { kind, strike, notional, nowSeconds } = input;
  if (kind !== "CALL" && kind !== "PUT") throw new Error("Unsupported option direction.");
  if (strike < BigInt(0) || strike > OPTIONS_RATE_SCALE) throw new Error("Strike must be between 0% and 100%.");
  if (notional <= BigInt(0)) throw new Error("Notional must be greater than zero.");
  if (nowSeconds < BigInt(0)) throw new Error("Current time must not be negative.");

  const currentRate = OPTIONS_DEVELOPMENT_PREVIEW_RATE;
  const distance = currentRate > strike ? currentRate - strike : strike - currentRate;
  const basePremium = (notional * BASE_PREMIUM_BPS) / BASIS_POINTS;
  const distanceAmount = (notional * distance) / OPTIONS_RATE_SCALE;
  const distancePremium = (distanceAmount * DISTANCE_PREMIUM_BPS) / BASIS_POINTS;
  const premium = basePremium + distancePremium || BigInt(1);
  const settlementScenarioRate = kind === "CALL"
    ? (strike + SCENARIO_RATE_MOVE > OPTIONS_RATE_SCALE ? OPTIONS_RATE_SCALE : strike + SCENARIO_RATE_MOVE)
    : (strike > SCENARIO_RATE_MOVE ? strike - SCENARIO_RATE_MOVE : BigInt(0));
  const scenarioPayout = calculateOptionsScenarioPayout(
    kind,
    strike,
    notional,
    settlementScenarioRate,
  );

  return {
    kind,
    currentRate,
    strike,
    notional,
    premium,
    maxPayout: calculateOptionsScenarioPayout(
      kind,
      strike,
      notional,
      kind === "CALL" ? OPTIONS_RATE_SCALE : BigInt(0),
    ),
    breakevenRate: getOptionsBreakevenRate(kind, strike, premium, notional),
    settlementScenarioRate,
    settlementScenarioPayout: scenarioPayout,
    expiry: optionsExpiryFrom(nowSeconds),
  };
}
