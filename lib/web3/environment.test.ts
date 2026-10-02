import { describe, expect, it } from "bun:test";
import { getConfiguredChainId, getConfiguredNetwork } from "./environment";

describe("configured Robinhood network", () => {
  it("defaults to mainnet and supports explicit testnet selection", () => {
    const previous = process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV;
    try {
      delete process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV;
      expect(getConfiguredNetwork()).toBe("mainnet");
      expect(getConfiguredChainId()).toBe(4663);

      process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV = "testnet";
      expect(getConfiguredNetwork()).toBe("testnet");
      expect(getConfiguredChainId()).toBe(46630);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV;
      else process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV = previous;
    }
  });
});
