import { describe, expect, it } from "bun:test";
import { ContractYieldMarketAdapter } from "./contract-yield-market-adapter";

describe("live contract adapter boundary", () => {
  it("fails explicitly until verified live integration is configured", async () => {
    const adapter = new ContractYieldMarketAdapter();

    await expect(adapter.getMarkets()).rejects.toMatchObject({
      code: "live-integration-not-configured",
    });
    await expect(
      adapter.getTransactionStatus(
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        46630,
      ),
    ).rejects.toMatchObject({ code: "live-integration-not-configured" });
  });
});
