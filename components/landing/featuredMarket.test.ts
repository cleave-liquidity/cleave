import { describe, expect, it } from "bun:test";
import { marketHref } from "./featuredMarket";

describe("landing market links", () => {
  it("opens the shared trade workspace with the canonical market ID", () => {
    expect(
      marketHref("0xc2b89e6eca583e2c232201ac557e9be58af55f4c", "fixed", 100),
    ).toBe("/trade?market=0xc2b89e6eca583e2c232201ac557e9be58af55f4c&strategy=fixed&amount=100");
  });
});
