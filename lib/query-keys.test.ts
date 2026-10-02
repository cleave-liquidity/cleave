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
});
