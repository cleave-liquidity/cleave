// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveLens} from "../src/CleaveLens.sol";
import {CleaveLifecycleManager} from "../src/CleaveLifecycleManager.sol";
import {ModuleFixture} from "./ModuleFixture.sol";

contract CleaveLensTest is ModuleFixture {
    CleaveLens private lens;
    address private constant EXISTING_REGISTRY = address(uint160(0x5001));

    function setUp() public {
        _deployModules();
        _registerAdapter();
        _registerMarket(block.timestamp + 1000);
        lens = new CleaveLens(
            EXISTING_REGISTRY,
            address(accessManager),
            address(adapterRegistry),
            address(marketRegistry),
            address(riskGuard),
            address(executionRouter),
            address(lifecycleManager)
        );
    }

    function testReadsAllProtocolModules() public view {
        CleaveLens.ProtocolModules memory modules = lens.getProtocolModules();
        assert(modules.registry == EXISTING_REGISTRY);
        assert(modules.accessManager == address(accessManager));
        assert(modules.adapterRegistry == address(adapterRegistry));
        assert(modules.marketRegistry == address(marketRegistry));
        assert(modules.riskGuard == address(riskGuard));
        assert(modules.executionRouter == address(executionRouter));
        assert(modules.lifecycleManager == address(lifecycleManager));
    }

    function testReadsCombinedMarketAndLifecycleState() public view {
        CleaveLens.MarketSummary memory summary = lens.getMarketSummary(MARKET_ID);
        assert(summary.market == MARKET);
        assert(summary.pt == PT);
        assert(summary.yt == YT);
        assert(summary.sy == SY);
        assert(summary.underlying == UNDERLYING);
        assert(summary.adapterEnabled);
        assert(summary.marketEnabled);
        assert(summary.executionAllowed);
        assert(summary.fixedState == uint8(CleaveLifecycleManager.State.Active));
        assert(summary.tradingYieldState == uint8(CleaveLifecycleManager.State.Active));
        assert(summary.fixedSellEarlyEligible);
        assert(summary.tradingYieldClaimYieldEligible);
    }
}
