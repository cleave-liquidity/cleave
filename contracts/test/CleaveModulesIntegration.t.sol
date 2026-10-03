// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "../src/CleaveAccessManager.sol";
import {CleaveAdapterRegistry} from "../src/CleaveAdapterRegistry.sol";
import {CleaveExecutionRouter} from "../src/CleaveExecutionRouter.sol";
import {CleaveMarketRegistry} from "../src/CleaveMarketRegistry.sol";
import {CleaveRiskGuard} from "../src/CleaveRiskGuard.sol";

contract CleaveModulesIntegrationTest {
    function testPermissionsAdaptersMarketsRiskAndExecutionCompose() public {
        CleaveAccessManager access = new CleaveAccessManager(address(this));
        CleaveAdapterRegistry adapters = new CleaveAdapterRegistry(address(access));
        CleaveMarketRegistry markets = new CleaveMarketRegistry(address(access), address(adapters));
        CleaveRiskGuard risk = new CleaveRiskGuard(address(access));
        CleaveExecutionRouter router = new CleaveExecutionRouter(
            address(access),
            address(adapters),
            address(markets),
            address(risk)
        );

        bytes32 adapterId = bytes32("PENDLE");
        bytes32 marketId = bytes32("USDG-MARKET");
        adapters.registerAdapter(adapterId, bytes32("PENDLE"), address(uint160(0x6001)), 4663);
        markets.registerMarket(
            marketId,
            adapterId,
            address(uint160(0x6002)),
            address(uint160(0x6003)),
            address(uint160(0x6004)),
            address(uint160(0x6005)),
            address(uint160(0x6006)),
            block.timestamp + 1000,
            4663
        );

        (bool allowed,, address externalRouter) = router.validateExecution(marketId);
        assert(allowed);
        assert(externalRouter == address(uint160(0x6001)));

        risk.setGlobalPause(true);
        (allowed,,) = router.validateExecution(marketId);
        assert(!allowed);
    }
}
