// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraAccessManager} from "../src/YeltraAccessManager.sol";
import {YeltraAdapterRegistry} from "../src/YeltraAdapterRegistry.sol";
import {CleaveLens} from "../src/CleaveLens.sol";
import {YeltraExecutionRouter} from "../src/YeltraExecutionRouter.sol";
import {YeltraLens} from "../src/YeltraLens.sol";
import {YeltraLifecycleManager} from "../src/YeltraLifecycleManager.sol";
import {YeltraMarketRegistry} from "../src/YeltraMarketRegistry.sol";
import {YeltraRegistry} from "../src/YeltraRegistry.sol";
import {YeltraRiskGuard} from "../src/YeltraRiskGuard.sol";

contract YeltraCompatibilityTest {
    function testYeltraGraphPreservesModuleWiringAndRoles() public {
        YeltraAccessManager accessManager = new YeltraAccessManager(address(this));
        YeltraRegistry registry = new YeltraRegistry(address(this));
        YeltraAdapterRegistry adapterRegistry = new YeltraAdapterRegistry(address(accessManager));
        YeltraMarketRegistry marketRegistry = new YeltraMarketRegistry(address(accessManager), address(adapterRegistry));
        YeltraRiskGuard riskGuard = new YeltraRiskGuard(address(accessManager));
        YeltraExecutionRouter executionRouter = new YeltraExecutionRouter(
            address(accessManager),
            address(adapterRegistry),
            address(marketRegistry),
            address(riskGuard)
        );
        YeltraLifecycleManager lifecycleManager = new YeltraLifecycleManager(address(marketRegistry));
        YeltraLens lens = new YeltraLens(
            address(registry),
            address(accessManager),
            address(adapterRegistry),
            address(marketRegistry),
            address(riskGuard),
            address(executionRouter),
            address(lifecycleManager)
        );

        assert(registry.owner() == address(this));
        assert(accessManager.hasRole(accessManager.ADMIN_ROLE(), address(this)));
        assert(accessManager.hasRole(accessManager.OPERATOR_ROLE(), address(this)));
        assert(accessManager.hasRole(accessManager.GUARDIAN_ROLE(), address(this)));
        assert(address(adapterRegistry.accessManager()) == address(accessManager));
        assert(address(marketRegistry.adapterRegistry()) == address(adapterRegistry));
        assert(address(executionRouter.marketRegistry()) == address(marketRegistry));
        assert(address(executionRouter.riskGuard()) == address(riskGuard));
        assert(address(lifecycleManager.marketRegistry()) == address(marketRegistry));

        CleaveLens.ProtocolModules memory modules = lens.getProtocolModules();
        assert(modules.registry == address(registry));
        assert(modules.accessManager == address(accessManager));
        assert(modules.adapterRegistry == address(adapterRegistry));
        assert(modules.marketRegistry == address(marketRegistry));
        assert(modules.riskGuard == address(riskGuard));
        assert(modules.executionRouter == address(executionRouter));
        assert(modules.lifecycleManager == address(lifecycleManager));
    }
}
