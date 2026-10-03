import { describe, expect, it } from "bun:test";
import { getContractByName, getContractDeployments } from "./deployments";
import { getProjectContractDeployments } from "./project-deployments";

describe("verified contract deployment registry", () => {
  it("marks the Mainnet Pendle router as the active runtime spender", () => {
    const router = getContractByName(4663, "Pendle Router V2");

    expect(router?.address).toBe("0x888888888889758F76e7103c6CbF23ABbF58F946");
    expect(router?.chainId).toBe(4663);
    expect(router?.ownership).toBe("external");
    expect(router?.usedByRuntime).toBe(true);
  });

  it("keeps Testnet empty instead of copying Mainnet addresses", () => {
    expect(getContractDeployments("testnet")).toEqual([]);
    expect(getProjectContractDeployments(46630)).toEqual([]);
  });

  it("does not invent a CLEAVE-owned deployment before a broadcast is synchronized", () => {
    expect(getProjectContractDeployments(4663)).toEqual([]);
    expect(getProjectContractDeployments(46630)).toEqual([]);
  });
});
