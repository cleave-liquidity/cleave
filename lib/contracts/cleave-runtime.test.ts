import { describe, expect, it } from "bun:test";
import {
  CLEAVE_PENDLE_ADAPTER_ID,
  cleaveMarketKey,
  readCleaveLifecycle,
  readCleaveMarketSummary,
  validateCleaveExecution,
} from "./cleave-runtime";

const marketId = "0x206a5cd00e9ffabb8ca564076b64799a78df19b9";
const pendleRouter = "0x888888888889758F76e7103c6CbF23ABbF58F946" as `0x${string}`;

describe("CLEAVE Mainnet runtime reads", () => {
  it("derives the same market key used by the on-chain registry", () => {
    expect(cleaveMarketKey(marketId)).toBe(
      "0x91ba08faf37eaba80f0c3cb971b7118130d386db2c4f975b6f1a8ccf18999203",
    );
  });

  it("validates an enabled market, adapter, risk state, and Pendle router", async () => {
    const publicClient = {
      chain: { id: 4663 },
      readContract: async () => [true, CLEAVE_PENDLE_ADAPTER_ID, pendleRouter],
    } as any;

    await expect(validateCleaveExecution(marketId, publicClient)).resolves.toMatchObject({
      marketKey: cleaveMarketKey(marketId),
      adapterId: CLEAVE_PENDLE_ADAPTER_ID,
      externalRouter: pendleRouter,
    });
  });

  it("rejects a market that the deployed execution boundary does not allow", async () => {
    const publicClient = {
      chain: { id: 4663 },
      readContract: async () => [false, CLEAVE_PENDLE_ADAPTER_ID, "0x0000000000000000000000000000000000000000"],
    } as any;

    await expect(validateCleaveExecution(marketId, publicClient)).rejects.toMatchObject({
      code: "live-source-unavailable",
    });
  });

  it("reads lifecycle eligibility for Trading Yield", async () => {
    const publicClient = {
      chain: { id: 4663 },
      readContract: async () => ({
        state: 1,
        sellEarlyEligible: true,
        redeemAtMaturityEligible: false,
        claimYieldEligible: true,
        maturity: BigInt(1_800_000_000),
      }),
    } as any;

    await expect(readCleaveLifecycle(marketId, "long", publicClient)).resolves.toEqual({
      state: 1,
      sellEarlyEligible: true,
      redeemAtMaturityEligible: false,
      claimYieldEligible: true,
      maturity: BigInt(1_800_000_000),
    });
  });

  it("reads the deployed Lens execution and lifecycle summary", async () => {
    const publicClient = {
      chain: { id: 4663 },
      readContract: async () => ({
        marketEnabled: true,
        adapterEnabled: true,
        globalPaused: false,
        marketPaused: false,
        adapterPaused: false,
        executionAllowed: true,
        fixedState: 1,
        tradingYieldState: 1,
        fixedSellEarlyEligible: true,
        fixedRedeemAtMaturityEligible: false,
        tradingYieldSellEarlyEligible: true,
        tradingYieldClaimYieldEligible: true,
      }),
    } as any;

    await expect(readCleaveMarketSummary(marketId, publicClient)).resolves.toMatchObject({
      marketEnabled: true,
      adapterEnabled: true,
      executionAllowed: true,
      fixedState: 1,
      tradingYieldState: 1,
    });
  });
});
