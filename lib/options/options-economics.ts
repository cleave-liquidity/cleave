export const OPTIONS_RATE_SCALE = BigInt(10) ** BigInt(18);
export const OPTIONS_TESTNET_TENOR_SECONDS = BigInt(30 * 24 * 60 * 60);

// The development UI offers three strikes around the published index rate.
// One grid step is 0.5 percentage points; outer strikes are 1 point away.
const STRIKE_GRID_STEP = BigInt("5000000000000000");
const STRIKE_OFFSETS = [-2, 0, 2] as const;

export type OptionsDirection = "CALL" | "PUT";

export function getOptionsTestnetStrikeLadder(currentRate: bigint): bigint[] {
  const boundedRate = currentRate < BigInt(0)
    ? BigInt(0)
    : currentRate > OPTIONS_RATE_SCALE
      ? OPTIONS_RATE_SCALE
      : currentRate;
  const center = ((boundedRate + STRIKE_GRID_STEP / BigInt(2)) / STRIKE_GRID_STEP) * STRIKE_GRID_STEP;

  return [...new Set(STRIKE_OFFSETS.map((offset) => center + BigInt(offset) * STRIKE_GRID_STEP))]
    .filter((strike) => strike >= BigInt(0) && strike <= OPTIONS_RATE_SCALE);
}

export function getOptionsBreakevenRate(
  direction: OptionsDirection,
  strike: bigint,
  premium: bigint,
  notional: bigint,
): bigint | undefined {
  if (notional <= BigInt(0) || premium < BigInt(0)) return undefined;
  const rateDistance = (premium * OPTIONS_RATE_SCALE + notional - BigInt(1)) / notional;
  const breakeven = direction === "CALL" ? strike + rateDistance : strike - rateDistance;
  return breakeven >= BigInt(0) && breakeven <= OPTIONS_RATE_SCALE ? breakeven : undefined;
}

export function optionsExpiryFrom(nowSeconds: bigint): bigint {
  return nowSeconds + OPTIONS_TESTNET_TENOR_SECONDS;
}
