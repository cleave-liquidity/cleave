import { describe, expect, it } from "bun:test";
import { getConfiguredDataMode } from "./config";

describe("configured application data mode", () => {
  it("defaults to live and requires an explicit mock opt-in", () => {
    const previous = process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE;
    try {
      delete process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE;
      expect(getConfiguredDataMode()).toBe("live");

      process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE = "mock";
      expect(getConfiguredDataMode()).toBe("mock");

      process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE = "unexpected-value";
      expect(getConfiguredDataMode()).toBe("live");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE;
      else process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE = previous;
    }
  });
});
