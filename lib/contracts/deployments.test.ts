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

  it("keeps the confirmed CLEAVE-owned deployment isolated to Testnet", () => {
    expect(getProjectContractDeployments(4663)).toEqual([]);
    const registry = getProjectContractDeployments(46630);

    expect(registry).toHaveLength(8);
    expect(registry.map((deployment) => deployment.name)).toEqual([
      "CleaveRegistry",
      "CleaveAccessManager",
      "CleaveAdapterRegistry",
      "CleaveMarketRegistry",
      "CleaveRiskGuard",
      "CleaveExecutionRouter",
      "CleaveLifecycleManager",
      "CleaveLens",
    ]);
    for (const deployment of registry) {
      expect(deployment.chainId).toBe(46630);
      expect(deployment.ownership).toBe("project");
      expect(deployment.verified).toBe(true);
      expect(deployment.usedByRuntime).toBe(false);
      expect(deployment.deploymentTx).toMatch(/^0x[0-9a-f]{64}$/);
      expect(deployment.deploymentBlock).toBeGreaterThan(0);
      expect(deployment.gasUsed).toMatch(/^[0-9]+$/);
    }
    expect(registry[0]?.address).toBe("0xa5d21b39258da11152a0e63135936b1e60acfe43");
    expect(getContractDeployments("mainnet").some((deployment) => deployment.ownership === "project")).toBe(false);
  });
});
