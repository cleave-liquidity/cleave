// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "../src/CleaveAccessManager.sol";
import {YeltraDividendAccounting} from "../src/YeltraDividendAccounting.sol";
import {YeltraDividendRegistry} from "../src/YeltraDividendRegistry.sol";
import {YeltraDividendLens} from "../src/YeltraDividendLens.sol";

contract DividendOwner {
    function enable(YeltraDividendAccounting accounting, bytes32 positionId) external {
        accounting.enablePosition(positionId, true);
    }
}

contract YeltraDividendTest {
    CleaveAccessManager private access;
    YeltraDividendRegistry private registry;
    YeltraDividendAccounting private accounting;
    YeltraDividendLens private lens;
    bytes32 private constant MARKET_ID = bytes32("NVDA-TRADING-YIELD");
    bytes32 private constant POSITION_ID = bytes32("POSITION-1");
    bytes32 private constant EVENT_ID = bytes32("DIVIDEND-1");
    address private constant UNDERLYING = address(0x1234);
    address private constant SOURCE = address(0x5678);
    address private owner;

    function setUp() public {
        owner = address(this);
        access = new CleaveAccessManager(owner);
        registry = new YeltraDividendRegistry(address(access));
        accounting = registry.accounting();
        lens = new YeltraDividendLens(address(registry));
        registry.configureMarket(MARKET_ID, UNDERLYING, SOURCE, 18, 6, 0);
        registry.registerPosition(POSITION_ID, MARKET_ID, owner, 2e18, uint64(block.timestamp));
    }

    function testExplicitOptInAndFixedPointAccrual() public {
        YeltraDividendLens.State memory initialState = lens.dividendState(MARKET_ID, POSITION_ID);
        assert(initialState.eligible);
        assert(!initialState.enabled);
        assert(initialState.status == YeltraDividendLens.Status.ELIGIBLE);

        accounting.enablePosition(POSITION_ID, true);
        registry.processDividend(MARKET_ID, EVENT_ID, UNDERLYING, 25, 2, uint64(block.timestamp + 1), 1);

        uint256 accrued = accounting.previewAccrued(POSITION_ID);
        assert(accrued == 500000);
        YeltraDividendLens.State memory finalState = lens.dividendState(MARKET_ID, POSITION_ID);
        assert(finalState.enabled);
        assert(finalState.status == YeltraDividendLens.Status.PENDING);
        assert(!accounting.settlementEnabled());
    }

    function testDuplicateAndStaleEventsAreRejected() public {
        accounting.enablePosition(POSITION_ID, true);
        registry.processDividend(MARKET_ID, EVENT_ID, UNDERLYING, 25, 2, uint64(block.timestamp + 1), 1);
        (bool duplicateSuccess,) = address(registry).call(
            abi.encodeCall(registry.processDividend, (MARKET_ID, EVENT_ID, UNDERLYING, 25, 2, uint64(block.timestamp + 2), 2))
        );
        assert(!duplicateSuccess);
        (bool staleSuccess,) = address(registry).call(
            abi.encodeCall(registry.processDividend, (MARKET_ID, bytes32("DIVIDEND-2"), UNDERLYING, 25, 2, uint64(block.timestamp + 1), 1))
        );
        assert(!staleSuccess);
    }

    function testWrongUnderlyingAndWrongMarketAreRejected() public {
        accounting.enablePosition(POSITION_ID, true);
        (bool wrongUnderlying,) = address(registry).call(
            abi.encodeCall(
                registry.processDividend,
                (MARKET_ID, EVENT_ID, address(0x9999), 25, 2, uint64(block.timestamp + 1), 1)
            )
        );
        assert(!wrongUnderlying);

        (bool wrongMarket,) = address(registry).call(
            abi.encodeCall(
                registry.processDividend,
                (bytes32("OTHER-MARKET"), bytes32("DIVIDEND-2"), UNDERLYING, 25, 2, uint64(block.timestamp + 1), 1)
            )
        );
        assert(!wrongMarket);
    }

    function testZeroDividendAndInvalidSequenceAreRejected() public {
        accounting.enablePosition(POSITION_ID, true);
        (bool zeroRate,) = address(registry).call(
            abi.encodeCall(registry.processDividend, (MARKET_ID, EVENT_ID, UNDERLYING, 0, 2, uint64(block.timestamp + 1), 1))
        );
        assert(!zeroRate);

        (bool zeroSequence,) = address(registry).call(
            abi.encodeCall(registry.processDividend, (MARKET_ID, EVENT_ID, UNDERLYING, 25, 2, uint64(block.timestamp + 1), 0))
        );
        assert(!zeroSequence);
    }

    function testOptInDoesNotReceiveEventsProcessedBeforeActivation() public {
        registry.processDividend(MARKET_ID, EVENT_ID, UNDERLYING, 25, 2, uint64(block.timestamp + 1), 1);
        accounting.enablePosition(POSITION_ID, true);
        assert(accounting.previewAccrued(POSITION_ID) == 0);

        registry.processDividend(MARKET_ID, bytes32("DIVIDEND-2"), UNDERLYING, 25, 2, uint64(block.timestamp + 2), 2);
        assert(accounting.previewAccrued(POSITION_ID) == 500000);
    }

    function testMultipleEventsAccumulateAndClosingStopsFutureAccrual() public {
        accounting.enablePosition(POSITION_ID, true);
        registry.processDividend(MARKET_ID, EVENT_ID, UNDERLYING, 25, 2, uint64(block.timestamp + 1), 1);
        registry.processDividend(MARKET_ID, bytes32("DIVIDEND-2"), UNDERLYING, 10, 2, uint64(block.timestamp + 2), 2);
        assert(accounting.previewAccrued(POSITION_ID) == 700000);

        registry.updatePositionExposure(POSITION_ID, 0, true);
        assert(accounting.previewAccrued(POSITION_ID) == 700000);
        YeltraDividendLens.State memory closedState = lens.dividendState(MARKET_ID, POSITION_ID);
        assert(!closedState.eligible);
    }

    function testPositionRegisteredAfterEventStartsAtCurrentIndex() public {
        registry.processDividend(MARKET_ID, EVENT_ID, UNDERLYING, 25, 2, uint64(block.timestamp + 1), 1);
        bytes32 laterPosition = bytes32("POSITION-2");
        registry.registerPosition(laterPosition, MARKET_ID, owner, 2e18, uint64(block.timestamp + 2));
        accounting.enablePosition(laterPosition, true);
        assert(accounting.previewAccrued(laterPosition) == 0);
    }

    function testPausedMarketCannotProcessAndLensIsUnavailable() public {
        registry.setMarketStatus(MARKET_ID, false, true);
        (bool processed,) = address(registry).call(
            abi.encodeCall(registry.processDividend, (MARKET_ID, EVENT_ID, UNDERLYING, 25, 2, uint64(block.timestamp + 1), 1))
        );
        assert(!processed);
        YeltraDividendLens.State memory state = lens.dividendState(MARKET_ID, POSITION_ID);
        assert(!state.eligible);
        assert(state.status == YeltraDividendLens.Status.UNAVAILABLE);
    }

    function testOnlyPositionOwnerCanOptIn() public {
        DividendOwner caller = new DividendOwner();
        (bool success,) = address(caller).call(abi.encodeCall(caller.enable, (accounting, POSITION_ID)));
        assert(!success);
    }

    function testRegistrySupportsMultipleIndependentCanonicalMarketIds() public {
        bytes32 nvdaMarketId = keccak256(abi.encode(uint256(4663), keccak256("PENDLE"), address(0x1111)));
        bytes32 sgovMarketId = keccak256(abi.encode(uint256(4663), keccak256("PENDLE"), address(0x2222)));

        registry.configureMarket(nvdaMarketId, address(0x3333), SOURCE, 18, 6, 0);
        registry.configureMarket(sgovMarketId, address(0x4444), SOURCE, 18, 6, 0);

        YeltraDividendRegistry.MarketConfig memory nvda = registry.getMarket(nvdaMarketId);
        YeltraDividendRegistry.MarketConfig memory sgov = registry.getMarket(sgovMarketId);
        assert(nvda.enabled && sgov.enabled);
        assert(nvda.underlying == address(0x3333));
        assert(sgov.underlying == address(0x4444));
        assert(nvdaMarketId != sgovMarketId);
    }
}
