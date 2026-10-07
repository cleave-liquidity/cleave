// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "../src/CleaveAccessManager.sol";
import {YeltraMarketDirectory} from "../src/YeltraMarketDirectory.sol";

contract DirectoryCaller {
    function register(
        address directory,
        bytes32 marketId,
        bytes32 providerId,
        bytes32 marketType,
        address market,
        address underlying,
        uint256 chainId
    ) external returns (bool) {
        (bool success,) = directory.call(
            abi.encodeWithSelector(
                YeltraMarketDirectory.registerMarket.selector,
                marketId,
                providerId,
                marketType,
                market,
                underlying,
                chainId
            )
        );
        return success;
    }
}

contract YeltraMarketDirectoryTest {
    CleaveAccessManager private accessManager;
    YeltraMarketDirectory private directory;

    bytes32 private constant MARKET_ID = keccak256("morpho:4663:steakhouse-usdg");
    bytes32 private constant PROVIDER_ID = bytes32("MORPHO");
    bytes32 private constant MARKET_TYPE = bytes32("VAULT");
    address private constant MARKET = address(0x1001);
    address private constant UNDERLYING = address(0x1002);

    function setUp() public {
        accessManager = new CleaveAccessManager(address(this));
        directory = new YeltraMarketDirectory(address(accessManager));
    }

    function testRegistersGenericExternalMarket() public {
        directory.registerMarket(MARKET_ID, PROVIDER_ID, MARKET_TYPE, MARKET, UNDERLYING, block.chainid);

        YeltraMarketDirectory.MarketRecord memory record = directory.getMarket(MARKET_ID);
        assert(record.marketAddress == MARKET);
        assert(record.providerId == PROVIDER_ID);
        assert(record.marketType == MARKET_TYPE);
        assert(record.underlyingAsset == UNDERLYING);
        assert(record.enabled);
        assert(directory.isRegisteredMarket(MARKET));
        assert(directory.isMarketActive(MARKET_ID));
    }

    function testRejectsDuplicateMarketIdAndAddress() public {
        directory.registerMarket(MARKET_ID, PROVIDER_ID, MARKET_TYPE, MARKET, UNDERLYING, 4663);

        (bool duplicateId,) = address(directory).call(
            abi.encodeWithSelector(
                YeltraMarketDirectory.registerMarket.selector,
                MARKET_ID,
                PROVIDER_ID,
                MARKET_TYPE,
                address(0x1003),
                UNDERLYING,
                block.chainid
            )
        );
        assert(!duplicateId);

        (bool duplicateAddress,) = address(directory).call(
            abi.encodeWithSelector(
                YeltraMarketDirectory.registerMarket.selector,
                keccak256("morpho:4663:duplicate-address"),
                PROVIDER_ID,
                MARKET_TYPE,
                MARKET,
                UNDERLYING,
                block.chainid
            )
        );
        assert(!duplicateAddress);
    }

    function testOperatorCanDisableMarket() public {
        directory.registerMarket(MARKET_ID, PROVIDER_ID, MARKET_TYPE, MARKET, UNDERLYING, block.chainid);
        directory.setMarketEnabled(MARKET_ID, false);
        assert(!directory.isMarketActive(MARKET_ID));
    }

    function testRejectsUnauthorizedRegistration() public {
        DirectoryCaller caller = new DirectoryCaller();
        assert(
            !caller.register(
                address(directory),
                MARKET_ID,
                PROVIDER_ID,
                MARKET_TYPE,
                MARKET,
                UNDERLYING,
                block.chainid
            )
        );
    }
}
