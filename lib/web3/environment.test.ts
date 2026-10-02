import { describe, expect, it } from "bun:test";
import { getConfiguredChainId, getConfiguredNetwork } from "./environment";

describe("configured Robinhood network", () => {
  it("defaults to testnet and supports explicit mainnet selection", () => {
    const previous = process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV;
    try {
      delete process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV;
      expect(getConfiguredNetwork()).toBe("testnet");
      expect(getConfiguredChainId()).toBe(46630);

      process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV = "mainnet";
      expect(getConfiguredNetwork()).toBe("mainnet");
      expect(getConfiguredChainId()).toBe(4663);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV;
      else process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV = previous;
    }
  });
});
