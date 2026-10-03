// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveLifecycleManager} from "../src/CleaveLifecycleManager.sol";
import {ModuleFixture} from "./ModuleFixture.sol";

contract CleaveLifecycleManagerTest is ModuleFixture {
    function setUp() public {
        _deployModules();
        _registerAdapter();
    }

    function testActiveFixedAndTradingYieldRules() public {
        _registerMarket(block.timestamp + 1000);

        CleaveLifecycleManager.LifecycleStateView memory fixedState = lifecycleManager.getLifecycle(
            MARKET_ID,
            CleaveLifecycleManager.Strategy.FixedYield
        );
        assert(fixedState.state == CleaveLifecycleManager.State.Active);
        assert(fixedState.sellEarlyEligible);
        assert(!fixedState.redeemAtMaturityEligible);
        assert(!fixedState.claimYieldEligible);

        CleaveLifecycleManager.LifecycleStateView memory tradingState = lifecycleManager.getLifecycle(
            MARKET_ID,
            CleaveLifecycleManager.Strategy.TradingYield
        );
        assert(tradingState.state == CleaveLifecycleManager.State.Active);
        assert(tradingState.sellEarlyEligible);
        assert(tradingState.claimYieldEligible);
        assert(!tradingState.redeemAtMaturityEligible);
    }

    function testFixedMaturityAndTradingExpiryRules() public {
        _registerMarket(1);

        CleaveLifecycleManager.LifecycleStateView memory fixedState = lifecycleManager.getLifecycle(
            MARKET_ID,
            CleaveLifecycleManager.Strategy.FixedYield
        );
        assert(fixedState.state == CleaveLifecycleManager.State.Matured);
        assert(fixedState.redeemAtMaturityEligible);
        assert(!fixedState.sellEarlyEligible);

        CleaveLifecycleManager.LifecycleStateView memory tradingState = lifecycleManager.getLifecycle(
            MARKET_ID,
            CleaveLifecycleManager.Strategy.TradingYield
        );
        assert(tradingState.state == CleaveLifecycleManager.State.Expired);
        assert(tradingState.claimYieldEligible);
        assert(!tradingState.redeemAtMaturityEligible);
    }

    function testUnknownMarketIsUnavailable() public view {
        CleaveLifecycleManager.LifecycleStateView memory state = lifecycleManager.getLifecycle(
            bytes32("MISSING"),
            CleaveLifecycleManager.Strategy.FixedYield
        );
        assert(state.state == CleaveLifecycleManager.State.Unavailable);
        assert(!state.claimYieldEligible);
    }
}
