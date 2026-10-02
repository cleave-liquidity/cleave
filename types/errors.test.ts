import { describe, expect, it } from "bun:test";
import { getYieldErrorMessage, normalizeYieldError, YieldDomainError } from "./errors";

describe("yield error normalization", () => {
  it("maps wallet rejection without exposing provider text", () => {
    const error = normalizeYieldError({
      name: "UserRejectedRequestError",
      message: "User rejected the request with account details",
    });

    expect(error).toMatchObject({ code: "transaction-rejected" });
    expect(getYieldErrorMessage({ name: "UserRejectedRequestError" })).not.toContain(
      "account details",
    );
  });

  it("preserves domain errors", () => {
    const error = new YieldDomainError("wrong-network", "Select Robinhood Chain.");
    expect(normalizeYieldError(error)).toBe(error);
  });
});
