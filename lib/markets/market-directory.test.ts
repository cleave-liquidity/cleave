import { describe, expect, it } from "bun:test";
import {
  MARKET_DIRECTORY_MARKET_TYPES,
  MARKET_DIRECTORY_PROVIDER_IDS,
  getStableExternalMarketId,
  validateExternalMarketCandidate,
} from "./market-directory";

const VALID_CANDIDATE = {
  chainId: 4663,
  expectedChainId: 4663,
  providerId: MARKET_DIRECTORY_PROVIDER_IDS.MORPHO,
  marketType: MARKET_DIRECTORY_MARKET_TYPES.VAULT,
  marketAddress: "0xBeEff033F34C046626B8D0A041844C5d1A5409dd" as `0x${string}`,
  underlyingAsset: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as `0x${string}`,
  expectedUnderlying: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as `0x${string}`,
  bytecodePresent: true,
};

describe("YELTRA external market directory", () => {
  it("accepts the real Morpho Steakhouse USDG candidate", () => {
    expect(validateExternalMarketCandidate(VALID_CANDIDATE)).toEqual({ ok: true });
  });

  it("rejects a wrong chain", () => {
    expect(validateExternalMarketCandidate({ ...VALID_CANDIDATE, chainId: 46630 })).toEqual({
      ok: false,
      reason: "wrong-chain",
    });
  });

  it("rejects missing bytecode", () => {
    expect(validateExternalMarketCandidate({ ...VALID_CANDIDATE, bytecodePresent: false })).toEqual({
      ok: false,
      reason: "invalid-contract",
    });
  });

  it("rejects an underlying mismatch", () => {
    expect(
      validateExternalMarketCandidate({
        ...VALID_CANDIDATE,
        underlyingAsset: "0x0000000000000000000000000000000000000001",
      }),
    ).toEqual({ ok: false, reason: "underlying-mismatch" });
  });

  it("derives a stable id from provider, chain, and address", () => {
    expect(
      getStableExternalMarketId(
        MARKET_DIRECTORY_PROVIDER_IDS.MORPHO,
        4663,
        VALID_CANDIDATE.marketAddress,
      ),
    ).toBe("morpho:4663:0xbeeff033f34c046626b8d0a041844c5d1a5409dd");
  });
});
