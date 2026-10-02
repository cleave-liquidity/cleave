import { describe, expect, it } from "bun:test";
import { queryKeys } from "./query-keys";

describe("query key isolation", () => {
  it("separates the same resource across chain IDs", () => {
    expect(queryKeys.positions("0xAbC", 4663)).not.toEqual(
      queryKeys.positions("0xAbC", 46630),
    );
    expect(queryKeys.balance("0xAbC", "USDG", 4663)).not.toEqual(
      queryKeys.balance("0xAbC", "USDG", 46630),
    );
  });

  it("separates wallets and data modes", () => {
    const previous = process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE;
    try {
      process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE = "mock";
      const mockKey = queryKeys.positions("0xAbC", 4663);
      process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE = "live";
      const liveKey = queryKeys.positions("0xAbC", 4663);

      expect(mockKey).not.toEqual(liveKey);
      expect(queryKeys.positions("0xAbC", 4663)).not.toEqual(
        queryKeys.positions("0xDef", 4663),
      );
      expect(queryKeys.market("market-a", 4663)).not.toEqual(
        queryKeys.market("market-b", 4663),
      );
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE;
      else process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE = previous;
    }
  });
});
