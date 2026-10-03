import { describe, expect, it } from "bun:test";
import { MockYieldMarketAdapter, MOCK_MARKETS } from "./mock-adapter";
import { ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";

const ownerA = "0x0000000000000000000000000000000000000001" as `0x${string}`;
const ownerB = "0x0000000000000000000000000000000000000002" as `0x${string}`;

describe("mock yield market adapter", () => {
  it("requires a current quote and supported network for opening", async () => {
    const adapter = new MockYieldMarketAdapter();
    const quote = await adapter.getFixedQuote(MOCK_MARKETS[0].id, 100);

    await expect(
      adapter.openFixedPosition(MOCK_MARKETS[0].id, 100, ownerA, { ...quote, quoteExpiry: Date.now() - 1 }, ROBINHOOD_CHAIN_ID)
    ).rejects.toMatchObject({ code: "quote-expired" });

    await expect(
      adapter.openFixedPosition(MOCK_MARKETS[0].id, 100, ownerA, quote, 1)
    ).rejects.toMatchObject({ code: "wrong-network" });
  });

  it("isolates positions by owner and protects action ownership", async () => {
    const adapter = new MockYieldMarketAdapter();
    const quote = await adapter.getFixedQuote(MOCK_MARKETS[0].id, 100);
    const position = await adapter.openFixedPosition(
      MOCK_MARKETS[0].id,
      100,
      ownerA,
      quote,
      ROBINHOOD_CHAIN_ID
    );

    expect((await adapter.getPositions(ownerA)).map((item) => item.id)).toContain(position.id);
    expect(await adapter.getPositions(ownerB)).toEqual([]);
    await expect(adapter.sellPosition(position.id, ownerB)).rejects.toMatchObject({
      code: "position-owner-mismatch",
    });
  });

  it("supports long claim and closes positions through sell", async () => {
    const adapter = new MockYieldMarketAdapter();
    const quote = await adapter.getLongQuote(MOCK_MARKETS[1].id, 100);
    const position = await adapter.openLongPosition(
      MOCK_MARKETS[1].id,
      100,
      ownerA,
      quote,
      ROBINHOOD_CHAIN_ID
    );

    expect(position.claimableYield).toBeGreaterThan(0);
    const claim = await adapter.claimYield(position.id, ownerA);
    expect(claim.claimedAmount).toBeGreaterThan(0);
    await expect(adapter.claimYield(position.id, ownerA)).rejects.toMatchObject({
      code: "nothing-claimable",
    });

    const sold = await adapter.sellPosition(position.id, ownerA);
    expect(sold.returnedAmount).toBeGreaterThan(0);
    expect((await adapter.getPositions(ownerA)).find((item) => item.id === position.id)?.status).toBe("closed");
    await expect(adapter.sellPosition(position.id, ownerA)).rejects.toMatchObject({
      code: "position-not-sellable",
    });
  });

  it("enforces PT maturity and prevents YT redemption", async () => {
    const adapter = new MockYieldMarketAdapter();
    const fixedQuote = await adapter.getFixedQuote(MOCK_MARKETS[0].id, 100);
    const fixed = await adapter.openFixedPosition(
      MOCK_MARKETS[0].id,
      100,
      ownerA,
      fixedQuote,
      ROBINHOOD_CHAIN_ID
    );
    await expect(adapter.redeemFixed(fixed.id, ownerA)).rejects.toMatchObject({
      code: "pt-not-redeemable",
    });

    const longQuote = await adapter.getLongQuote(MOCK_MARKETS[1].id, 100);
    const long = await adapter.openLongPosition(
      MOCK_MARKETS[1].id,
      100,
      ownerA,
      longQuote,
      ROBINHOOD_CHAIN_ID
    );
    await expect(adapter.redeemFixed(long.id, ownerA)).rejects.toMatchObject({
      code: "position-not-found",
    });
  });

  it("allows Fixed Yield to sell before maturity", async () => {
    const adapter = new MockYieldMarketAdapter();
    const quote = await adapter.getFixedQuote(MOCK_MARKETS[0].id, 100);
    const position = await adapter.openFixedPosition(
      MOCK_MARKETS[0].id,
      100,
      ownerA,
      quote,
      ROBINHOOD_CHAIN_ID,
    );

    const sold = await adapter.sellPosition(position.id, ownerA, ROBINHOOD_CHAIN_ID);
    expect(sold.returnedAmount).toBeGreaterThan(0);
    expect((await adapter.getPositions(ownerA)).find((item) => item.id === position.id)?.status).toBe("closed");
  });

  it("rejects trades larger than the mock token balance", async () => {
    const adapter = new MockYieldMarketAdapter();
    const quote = await adapter.getFixedQuote(MOCK_MARKETS[0].id, 3_000);

    await expect(
      adapter.openFixedPosition(MOCK_MARKETS[0].id, 3_000, ownerA, quote, ROBINHOOD_CHAIN_ID)
    ).rejects.toMatchObject({ code: "insufficient-token-balance" });
  });
});
