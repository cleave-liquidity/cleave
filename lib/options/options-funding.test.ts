import { describe, expect, it } from "bun:test";
import { calculateOptionsFundingPlan } from "./options-funding";

const oneDollar = BigInt(1_000_000);

describe("calculateOptionsFundingPlan", () => {
  it("covers worst-case full-notional Call and Put payouts", () => {
    const plan = calculateOptionsFundingPlan({
      vaultBalance: BigInt(0),
      lockedCollateral: BigInt(0),
      reservedPayout: BigInt(0),
      callNotional: oneDollar,
      putNotional: oneDollar,
      demoWalletBalance: BigInt(0),
    });

    expect(plan.combinedNotional).toBe(BigInt(2_000_000));
    expect(plan.requiredVaultDeposit).toBe(BigInt(2_000_000));
    expect(plan.callPremiumBudget).toBe(BigInt(260_000));
    expect(plan.putPremiumBudget).toBe(BigInt(260_000));
    expect(plan.totalPremiumBudget).toBe(BigInt(520_000));
    expect(plan.requiredDemoMint).toBe(BigInt(520_000));
  });

  it("includes existing locked collateral and reserved payouts", () => {
    const plan = calculateOptionsFundingPlan({
      vaultBalance: BigInt(7_000_000),
      lockedCollateral: BigInt(5_000_000),
      reservedPayout: BigInt(3_000_000),
      callNotional: oneDollar,
      putNotional: oneDollar,
      demoWalletBalance: BigInt(1_000_000),
    });

    expect(plan.existingLiabilities).toBe(BigInt(8_000_000));
    expect(plan.requiredVaultDeposit).toBe(BigInt(3_000_000));
    expect(plan.requiredDemoMint).toBe(BigInt(0));
  });

  it("does not count premium receipts as pre-funded collateral", () => {
    const plan = calculateOptionsFundingPlan({
      vaultBalance: BigInt(2_000_000),
      lockedCollateral: BigInt(0),
      reservedPayout: BigInt(0),
      callNotional: oneDollar,
      putNotional: oneDollar,
      demoWalletBalance: BigInt(520_000),
    });

    expect(plan.requiredVaultDeposit).toBe(BigInt(0));
    expect(plan.requiredDemoMint).toBe(BigInt(0));
  });

  it("rounds the maximum premium buffer up for tiny raw amounts", () => {
    const plan = calculateOptionsFundingPlan({
      vaultBalance: BigInt(2),
      lockedCollateral: BigInt(0),
      reservedPayout: BigInt(0),
      callNotional: BigInt(1),
      putNotional: BigInt(1),
      demoWalletBalance: BigInt(0),
    });

    expect(plan.totalPremiumBudget).toBe(BigInt(2));
    expect(plan.requiredVaultDeposit).toBe(BigInt(0));
  });

  it("rejects a missing side of the two-sided demo plan", () => {
    expect(() => calculateOptionsFundingPlan({
      vaultBalance: BigInt(0),
      lockedCollateral: BigInt(0),
      reservedPayout: BigInt(0),
      callNotional: oneDollar,
      putNotional: BigInt(0),
      demoWalletBalance: BigInt(0),
    })).toThrow("Call and Put notionals must both be greater than zero");
  });
});
