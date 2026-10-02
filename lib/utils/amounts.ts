import { YieldDomainError } from "@/types/errors";

// Display values remain numbers in the mock UI. Keep them below the point where
// converting six decimal places can lose integer precision.
export const MAX_SAFE_DISPLAY_AMOUNT = Number.MAX_SAFE_INTEGER / 1_000_000;

export function assertSafeDisplayAmount(value: number): void {
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    value > MAX_SAFE_DISPLAY_AMOUNT ||
    !Number.isSafeInteger(Math.round(value * 1_000_000))
  ) {
    throw new YieldDomainError(
      "invalid-amount",
      "Enter a valid amount greater than zero.",
    );
  }
}

export function displayAmountToBaseUnits(value: number, decimals: number): bigint {
  assertSafeDisplayAmount(value);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new YieldDomainError("invalid-token-metadata", "Token decimals are invalid.");
  }
  const [whole, fraction = ""] = value.toFixed(Math.min(decimals, 6)).split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(`${whole}${paddedFraction}`);
}
