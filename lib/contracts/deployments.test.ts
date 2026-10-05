import { describe, expect, it } from "bun:test";
import { getContractByName, getContractDeployments, getContractDisplayName } from "./deployments";
import { getProjectContractDeployments } from "./project-deployments";

describe("verified contract deployment registry", () => {
  it("marks the Mainnet Pendle router as the active runtime spender", () => {
    const router = getContractByName(4663, "Pendle Router V2");

    expect(router?.address).toBe("0x888888888889758F76e7103c6CbF23ABbF58F946");
    expect(router?.chainId).toBe(4663);
    expect(router?.ownership).toBe("external");
    expect(router?.usedByRuntime).toBe(true);
  });

  it("preserves the confirmed YELTRA-owned deployments on both networks", () => {
    const mainnet = getProjectContractDeployments(4663);
    const registry = getProjectContractDeployments(46630);

    expect(mainnet).toHaveLength(8);
    expect(registry).toHaveLength(8);
    expect(mainnet.map((deployment) => deployment.name)).toEqual([
      "CleaveAccessManager",
      "CleaveRegistry",
      "CleaveAdapterRegistry",
      "CleaveMarketRegistry",
      "CleaveRiskGuard",
      "CleaveExecutionRouter",
      "CleaveLifecycleManager",
      "CleaveLens",
    ]);
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
    expect(mainnet.map((deployment) => deployment.verificationStatus)).toEqual([
      "VERIFIED",
      "VERIFIED",
      "VERIFIED",
      "VERIFIED",
      "VERIFIED",
      "DEPLOYED / NOT VERIFIED",
      "VERIFIED",
      "VERIFIED",
    ]);
    expect(mainnet.map((deployment) => deployment.verified)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
    ]);
    for (const deployment of mainnet) {
      expect(deployment.chainId).toBe(4663);
      expect(deployment.ownership).toBe("project");
      expect(deployment.usedByRuntime).toBe(false);
      expect(deployment.deploymentTx).toMatch(/^0x[0-9a-f]{64}$/);
      expect(deployment.deploymentBlock).toBeGreaterThan(0);
      expect(deployment.gasUsed).toMatch(/^[0-9]+$/);
    }
    expect(mainnet[0]?.address).toBe("0x8ba198d9275c65ee208eadd22084f38d0f193395");
    expect(registry[0]?.address).toBe("0xa5d21b39258da11152a0e63135936b1e60acfe43");
    expect(getContractDeployments("mainnet").filter((deployment) => deployment.ownership === "project")).toHaveLength(8);
  });

  it("keeps legacy artifact names internal while exposing YELTRA display names", () => {
    const deployment = getContractByName(4663, "CleaveExecutionRouter");
    expect(deployment?.name).toBe("CleaveExecutionRouter");
    expect(deployment && getContractDisplayName(deployment)).toBe("YELTRA Execution Router");
  });
});
