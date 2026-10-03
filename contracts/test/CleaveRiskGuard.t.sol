// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "../src/CleaveAccessManager.sol";
import {CleaveRiskGuard} from "../src/CleaveRiskGuard.sol";

contract RiskGuardCaller {
    function pause(CleaveRiskGuard guard, bytes32 marketId) external returns (bool) {
        (bool success,) = address(guard).call(
            abi.encodeWithSelector(CleaveRiskGuard.setMarketPause.selector, marketId, true)
        );
        return success;
    }
}

contract CleaveRiskGuardTest {
    CleaveAccessManager private accessManager;
    CleaveRiskGuard private guard;
    bytes32 private constant MARKET_ID = bytes32("USDG-MARKET");
    bytes32 private constant ADAPTER_ID = bytes32("PENDLE");

    function setUp() public {
        accessManager = new CleaveAccessManager(address(this));
        guard = new CleaveRiskGuard(address(accessManager));
    }

    function testExecutionStartsAllowed() public view {
        assert(guard.isExecutionAllowed(MARKET_ID, ADAPTER_ID));
    }

    function testGlobalMarketAndAdapterPausesBlockExecution() public {
        guard.setMarketPause(MARKET_ID, true);
        assert(!guard.isExecutionAllowed(MARKET_ID, ADAPTER_ID));
        guard.setMarketPause(MARKET_ID, false);

        guard.setAdapterPause(ADAPTER_ID, true);
        assert(!guard.isExecutionAllowed(MARKET_ID, ADAPTER_ID));
        guard.setAdapterPause(ADAPTER_ID, false);

        guard.setGlobalPause(true);
        assert(!guard.isExecutionAllowed(MARKET_ID, ADAPTER_ID));
    }

    function testUnauthorizedCallerCannotPause() public {
        RiskGuardCaller caller = new RiskGuardCaller();
        assert(!caller.pause(guard, MARKET_ID));
    }
}
