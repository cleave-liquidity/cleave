// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "../src/CleaveAccessManager.sol";
import {CleaveAdapterRegistry} from "../src/CleaveAdapterRegistry.sol";
import {CleaveMarketRegistry} from "../src/CleaveMarketRegistry.sol";

contract CleaveMarketRegistryTest {
    CleaveAccessManager private accessManager;
    CleaveAdapterRegistry private adapters;
    CleaveMarketRegistry private markets;
    bytes32 private constant ADAPTER_ID = bytes32("PENDLE");
    bytes32 private constant MARKET_ID = bytes32("USDG-MARKET");
    address private constant ROUTER = address(uint160(0x4001));

    function setUp() public {
        accessManager = new CleaveAccessManager(address(this));
        adapters = new CleaveAdapterRegistry(address(accessManager));
        markets = new CleaveMarketRegistry(address(accessManager), address(adapters));
        adapters.registerAdapter(ADAPTER_ID, bytes32("PENDLE"), ROUTER, 4663);
    }

    function testRegistersApprovedMarketMetadata() public {
        markets.registerMarket(
            MARKET_ID,
            ADAPTER_ID,
            address(uint160(0x4002)),
            address(uint160(0x4003)),
            address(uint160(0x4004)),
            address(uint160(0x4005)),
            address(uint160(0x4006)),
            block.timestamp + 1000,
            4663
        );

        CleaveMarketRegistry.MarketConfig memory market = markets.getMarket(MARKET_ID);
        assert(market.adapterId == ADAPTER_ID);
        assert(market.chainId == 4663);
        assert(market.enabled);
        assert(markets.isMarketSupported(MARKET_ID));
    }

    function testMarketIsUnsupportedWhenAdapterIsDisabled() public {
        markets.registerMarket(
            MARKET_ID,
            ADAPTER_ID,
            address(uint160(0x4002)),
            address(uint160(0x4003)),
            address(uint160(0x4004)),
            address(uint160(0x4005)),
            address(uint160(0x4006)),
            block.timestamp + 1000,
            4663
        );
        adapters.setAdapterEnabled(ADAPTER_ID, false);
        assert(!markets.isMarketSupported(MARKET_ID));
    }
}
