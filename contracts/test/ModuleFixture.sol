// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "../src/CleaveAccessManager.sol";
import {CleaveAdapterRegistry} from "../src/CleaveAdapterRegistry.sol";
import {CleaveExecutionRouter} from "../src/CleaveExecutionRouter.sol";
import {CleaveLifecycleManager} from "../src/CleaveLifecycleManager.sol";
import {CleaveMarketRegistry} from "../src/CleaveMarketRegistry.sol";
import {CleaveRiskGuard} from "../src/CleaveRiskGuard.sol";

abstract contract ModuleFixture {
    CleaveAccessManager internal accessManager;
    CleaveAdapterRegistry internal adapterRegistry;
    CleaveMarketRegistry internal marketRegistry;
    CleaveRiskGuard internal riskGuard;
    CleaveExecutionRouter internal executionRouter;
    CleaveLifecycleManager internal lifecycleManager;

    bytes32 internal constant ADAPTER_ID = bytes32("PENDLE");
    bytes32 internal constant PROTOCOL_ID = bytes32("PENDLE");
    bytes32 internal constant MARKET_ID = bytes32("USDG-MARKET");
    address internal constant ROUTER = address(uint160(0x1001));
    address internal constant MARKET = address(uint160(0x1002));
    address internal constant PT = address(uint160(0x1003));
    address internal constant YT = address(uint160(0x1004));
    address internal constant SY = address(uint160(0x1005));
    address internal constant UNDERLYING = address(uint160(0x1006));

    function _deployModules() internal {
        accessManager = new CleaveAccessManager(address(this));
        adapterRegistry = new CleaveAdapterRegistry(address(accessManager));
        marketRegistry = new CleaveMarketRegistry(address(accessManager), address(adapterRegistry));
        riskGuard = new CleaveRiskGuard(address(accessManager));
        executionRouter = new CleaveExecutionRouter(
            address(accessManager),
            address(adapterRegistry),
            address(marketRegistry),
            address(riskGuard)
        );
        lifecycleManager = new CleaveLifecycleManager(address(marketRegistry));
    }

    function _registerAdapter() internal {
        adapterRegistry.registerAdapter(ADAPTER_ID, PROTOCOL_ID, ROUTER, 4663);
    }

    function _registerMarket(uint256 maturity) internal {
        marketRegistry.registerMarket(
            MARKET_ID,
            ADAPTER_ID,
            MARKET,
            PT,
            YT,
            SY,
            UNDERLYING,
            maturity,
            4663
        );
    }
}
