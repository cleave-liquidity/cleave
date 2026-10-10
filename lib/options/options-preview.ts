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
    maxPayout: notional,
    breakevenRate: getOptionsBreakevenRate(kind, strike, premium, notional),
    settlementScenarioRate,
    settlementScenarioPayout: scenarioPayout,
    expiry: optionsExpiryFrom(nowSeconds),
  };
}
