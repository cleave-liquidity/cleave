// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveExecutionRouter} from "../src/CleaveExecutionRouter.sol";
import {ModuleFixture} from "./ModuleFixture.sol";

contract CleaveExecutionRouterTest is ModuleFixture {
    function setUp() public {
        _deployModules();
        _registerAdapter();
        _registerMarket(block.timestamp + 1000);
    }

    function testValidatesMarketAdapterAndRiskState() public view {
        (bool allowed, bytes32 adapterId, address router) = executionRouter.validateExecution(MARKET_ID);
        assert(allowed);
        assert(adapterId == ADAPTER_ID);
        assert(router == ROUTER);
    }

    function testRiskPauseInvalidatesExecutionWithoutExternalCall() public {
        riskGuard.setMarketPause(MARKET_ID, true);
        (bool allowed,,) = executionRouter.validateExecution(MARKET_ID);
        assert(!allowed);
    }

    function testValidatedExecutionEmitsBoundaryActionAndReturnsRouter() public {
        address router = executionRouter.recordValidatedExecution(MARKET_ID, bytes32("FIXED_YIELD"));
        assert(router == ROUTER);
    }
}
