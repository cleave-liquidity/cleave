import { describe, expect, it } from "bun:test";
import { getVerifiedTokenMetadataByAddress } from "./tokens";

const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";

describe("canonical token metadata", () => {
  it("resolves USDG metadata by underlying address, including its shared logo", () => {
    expect(getVerifiedTokenMetadataByAddress(4663, USDG)).toMatchObject({
      symbol: "USDG",
      name: "Global Dollar",
      iconUrl: "https://storage.googleapis.com/prod-pendle-bucket-a/images/uploads/0cdcce5a-050c-48cd-8059-30e36effae20.svg",
    });
  });

  it("does not resolve an unknown address by symbol", () => {
    expect(getVerifiedTokenMetadataByAddress(4663, "0x0000000000000000000000000000000000000001")).toBeUndefined();
  });
});
