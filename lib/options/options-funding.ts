export type OptionsFundingPlan = {
  combinedNotional: bigint;
  existingLiabilities: bigint;
  requiredVaultDeposit: bigint;
  callPremiumBudget: bigint;
  putPremiumBudget: bigint;
  totalPremiumBudget: bigint;
  requiredDemoMint: bigint;
};

function ceilMulDiv(value: bigint, multiplier: bigint, denominator: bigint): bigint {
  if (value < BigInt(0) || multiplier < BigInt(0) || denominator <= BigInt(0)) {
    throw new RangeError("Funding inputs must be non-negative and denominator must be positive.");
  }
  const product = value * multiplier;
  return (product + denominator - BigInt(1)) / denominator;
}

/**
 * Conservative Testnet funding plan. The largest possible premium is 26% of
 * notional (1% base + 25% maximum rate distance); maximum payout is the full
 * notional. Premiums are deliberately not counted as vault collateral.
 */
export function calculateOptionsFundingPlan(input: {
  vaultBalance: bigint;
  lockedCollateral: bigint;
  reservedPayout: bigint;
  callNotional: bigint;
  putNotional: bigint;
  demoWalletBalance: bigint;
}): OptionsFundingPlan {
  const values = Object.values(input);
  if (values.some((value) => value < BigInt(0))) {
    throw new RangeError("Funding inputs cannot be negative.");
  }
  if (input.callNotional === BigInt(0) || input.putNotional === BigInt(0)) {
    throw new RangeError("Call and Put notionals must both be greater than zero.");
  }

  const combinedNotional = input.callNotional + input.putNotional;
  const existingLiabilities = input.lockedCollateral + input.reservedPayout;
  const requiredTotalBalance = existingLiabilities + combinedNotional;
  const requiredVaultDeposit = requiredTotalBalance > input.vaultBalance
    ? requiredTotalBalance - input.vaultBalance
    : BigInt(0);
  const callPremiumBudget = ceilMulDiv(input.callNotional, BigInt(2600), BigInt(10_000));
  const putPremiumBudget = ceilMulDiv(input.putNotional, BigInt(2600), BigInt(10_000));
  const totalPremiumBudget = callPremiumBudget + putPremiumBudget;
  const requiredDemoMint = totalPremiumBudget > input.demoWalletBalance
    ? totalPremiumBudget - input.demoWalletBalance
    : BigInt(0);

  return {
    combinedNotional,
    existingLiabilities,
    requiredVaultDeposit,
    callPremiumBudget,
    putPremiumBudget,
    totalPremiumBudget,
    requiredDemoMint,
  };
}
