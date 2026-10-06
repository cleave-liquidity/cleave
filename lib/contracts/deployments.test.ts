import { describe, expect, it } from "bun:test";
import { getContractByName, getContractDeployments, getContractDisplayName } from "./deployments";
import { getProjectContractDeployments, legacyProjectContractDeployments } from "./project-deployments";

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
      "YeltraAccessManager",
      "YeltraRegistry",
      "YeltraAdapterRegistry",
      "YeltraMarketRegistry",
      "YeltraRiskGuard",
      "YeltraExecutionRouter",
      "YeltraLifecycleManager",
      "YeltraLens",
    ]);
    expect(registry.map((deployment) => deployment.name)).toEqual([
      "YeltraAccessManager",
      "YeltraRegistry",
      "YeltraAdapterRegistry",
      "YeltraMarketRegistry",
      "YeltraRiskGuard",
      "YeltraExecutionRouter",
      "YeltraLifecycleManager",
      "YeltraLens",
    ]);
    for (const deployment of registry) {
      expect(deployment.chainId).toBe(46630);
      expect(deployment.ownership).toBe("project");
      expect(deployment.verified).toBe(true);
      expect(deployment.usedByRuntime).toBe(true);
      expect(deployment.deploymentTx).toMatch(/^0x[0-9a-f]{64}$/);
      expect(deployment.deploymentBlock).toBeGreaterThan(0);
      expect(deployment.gasUsed).toMatch(/^[0-9]+$/);
    }
    expect(mainnet.map((deployment) => deployment.verificationStatus)).toEqual(Array(8).fill("VERIFIED"));
    expect(mainnet.map((deployment) => deployment.verified)).toEqual(Array(8).fill(true));
    for (const deployment of mainnet) {
      expect(deployment.chainId).toBe(4663);
      expect(deployment.ownership).toBe("project");
      expect(deployment.usedByRuntime).toBe(true);
      expect(deployment.deploymentTx).toMatch(/^0x[0-9a-f]{64}$/);
      expect(deployment.deploymentBlock).toBeGreaterThan(0);
      expect(deployment.gasUsed).toMatch(/^[0-9]+$/);
    }
    expect(mainnet[0]?.address).toBe("0xb12c7112446bfe88d6e82b516f5df90449fa3dc4");
    expect(registry[0]?.address).toBe("0x3aab079e0017af37c15c7ab11e319995cf426097");
    expect(getContractDeployments("mainnet").filter((deployment) => deployment.ownership === "project")).toHaveLength(8);
  });

  it("keeps the legacy graph available for rollback while exposing YELTRA display names", () => {
    const deployment = legacyProjectContractDeployments[4663]?.find((item) => item.name === "CleaveExecutionRouter");
    expect(deployment?.name).toBe("CleaveExecutionRouter");
    expect(deployment && getContractDisplayName(deployment)).toBe("YELTRA Execution Router");
    expect(getContractByName(4663, "YeltraExecutionRouter")?.name).toBe("YeltraExecutionRouter");
  });
});
