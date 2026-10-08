// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraDividendAccounting} from "./YeltraDividendAccounting.sol";
import {YeltraDividendRegistry} from "./YeltraDividendRegistry.sol";

/// @title YeltraDividendLens
/// @notice Read-only frontend surface for Dividend Earn state.
contract YeltraDividendLens {
    enum Status {
        UNAVAILABLE,
        ELIGIBLE,
        ACTIVE,
        PENDING,
        CLAIMABLE
    }

    YeltraDividendRegistry public immutable registry;
    YeltraDividendAccounting public immutable accounting;

    struct State {
        bool eligible;
        bool enabled;
        Status status;
        address underlying;
        address sourceAdapter;
        uint256 currentRateBaseUnits;
        uint8 currentRateDecimals;
        uint256 accruedBaseUnits;
        bytes32 lastEventId;
        uint64 lastEventTimestamp;
        bool settlementEnabled;
    }

    constructor(address registryAddress) {
        registry = YeltraDividendRegistry(registryAddress);
        accounting = registry.accounting();
    }

    function dividendState(bytes32 marketId, bytes32 positionId) external view returns (State memory state) {
        YeltraDividendRegistry.MarketConfig memory market = registry.getMarket(marketId);
        YeltraDividendAccounting.PositionState memory position = accounting.getPosition(positionId);
        state.underlying = market.underlying;
        state.sourceAdapter = market.sourceAdapter;
        state.currentRateBaseUnits = market.lastRateBaseUnits;
        state.currentRateDecimals = market.lastRateDecimals;
        state.lastEventId = market.lastEventId;
        state.lastEventTimestamp = market.lastEventTimestamp;
        state.settlementEnabled = false;
        if (
            market.underlying == address(0) || position.owner == address(0) || position.marketId != marketId
                || !market.enabled || market.paused
        ) return state;

        state.accruedBaseUnits = accounting.previewAccrued(positionId);
        state.enabled = position.enabled;
        state.eligible = position.exposureBaseUnits > 0 && !position.closed;
        state.status = !state.eligible
            ? Status.UNAVAILABLE
            : !state.enabled
                ? Status.ELIGIBLE
                : state.accruedBaseUnits > 0 ? Status.PENDING : Status.ACTIVE;
    }
}
