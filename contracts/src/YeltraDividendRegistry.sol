// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraDividendAccounting} from "./YeltraDividendAccounting.sol";

interface IYeltraDividendRegistryAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title YeltraDividendRegistry
/// @notice Authorized market/event boundary for the Dividend Earn accounting module.
/// @dev Off-chain source adapters submit normalized events here. No HTTP, token custody, or
///      settlement transfer is performed by this contract.
contract YeltraDividendRegistry {
    bytes32 public constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    uint16 public constant MAX_PROTOCOL_FEE_BPS = 1_000;

    struct MarketConfig {
        address underlying;
        address sourceAdapter;
        uint16 protocolFeeBps;
        uint256 lastRateBaseUnits;
        uint8 lastRateDecimals;
        bytes32 lastEventId;
        uint64 lastEventTimestamp;
        uint64 lastSequence;
        bool enabled;
        bool paused;
    }

    struct DividendEvent {
        bytes32 marketId;
        bytes32 eventId;
        uint256 rateBaseUnits;
        uint8 rateDecimals;
        uint64 processedAt;
        uint64 sequence;
    }

    error InvalidAddress();
    error InvalidMarket();
    error InvalidEvent();
    error DuplicateEvent(bytes32 eventId);
    error UnderlyingMismatch(address expected, address actual);
    error StaleEvent();
    error Unauthorized(address caller);
    error InvalidFee();

    IYeltraDividendRegistryAccess public immutable accessManager;
    YeltraDividendAccounting public immutable accounting;
    mapping(bytes32 => MarketConfig) public markets;
    mapping(bytes32 => bool) public processedEvents;
    mapping(bytes32 => DividendEvent) public dividendEvents;

    event DividendMarketConfigured(bytes32 indexed marketId, address indexed underlying, address sourceAdapter, uint16 protocolFeeBps);
    event DividendMarketStatus(bytes32 indexed marketId, bool enabled, bool paused);
    event DividendProcessed(bytes32 indexed marketId, bytes32 indexed eventId, uint256 rateBaseUnits, uint8 rateDecimals, uint64 sequence);

    constructor(address accessManagerAddress) {
        if (accessManagerAddress == address(0)) revert InvalidAddress();
        accessManager = IYeltraDividendRegistryAccess(accessManagerAddress);
        accounting = new YeltraDividendAccounting(accessManagerAddress, address(this));
    }

    function configureMarket(
        bytes32 marketId,
        address underlying,
        address sourceAdapter,
        uint8 exposureDecimals,
        uint8 rewardDecimals,
        uint16 protocolFeeBps
    ) external onlyAdminOrOperator {
        if (marketId == bytes32(0) || underlying == address(0) || sourceAdapter == address(0)) revert InvalidMarket();
        if (protocolFeeBps > MAX_PROTOCOL_FEE_BPS) revert InvalidFee();
        markets[marketId] = MarketConfig(underlying, sourceAdapter, protocolFeeBps, 0, 0, bytes32(0), 0, 0, true, false);
        accounting.configureMarket(marketId, exposureDecimals, rewardDecimals, true);
        emit DividendMarketConfigured(marketId, underlying, sourceAdapter, protocolFeeBps);
    }

    function setMarketStatus(bytes32 marketId, bool enabled, bool paused) external onlyAdminOrOperator {
        MarketConfig storage market = markets[marketId];
        if (market.underlying == address(0)) revert InvalidMarket();
        market.enabled = enabled;
        market.paused = paused;
        accounting.setMarketEnabled(marketId, enabled && !paused);
        emit DividendMarketStatus(marketId, enabled, paused);
    }

    function registerPosition(
        bytes32 positionId,
        bytes32 marketId,
        address owner,
        uint256 exposureBaseUnits,
        uint64 openedAt
    ) external onlyAdminOrOperator {
        MarketConfig memory market = markets[marketId];
        if (!market.enabled || market.paused) revert InvalidMarket();
        accounting.registerPosition(positionId, marketId, owner, exposureBaseUnits, openedAt);
    }

    function updatePositionExposure(bytes32 positionId, uint256 exposureBaseUnits, bool closed) external onlyAdminOrOperator {
        accounting.updatePositionExposure(positionId, exposureBaseUnits, closed);
    }

    function processDividend(
        bytes32 marketId,
        bytes32 eventId,
        address underlying,
        uint256 rateBaseUnits,
        uint8 rateDecimals,
        uint64 processedAt,
        uint64 sequence
    ) external onlyAdminOrOperator {
        MarketConfig storage market = markets[marketId];
        if (!market.enabled || market.paused || market.underlying == address(0)) revert InvalidMarket();
        if (underlying != market.underlying) revert UnderlyingMismatch(market.underlying, underlying);
        if (eventId == bytes32(0) || rateBaseUnits == 0 || processedAt == 0 || sequence == 0) revert InvalidEvent();
        if (processedEvents[eventId]) revert DuplicateEvent(eventId);
        if (processedAt <= market.lastEventTimestamp || sequence <= market.lastSequence) revert StaleEvent();

        accounting.applyDividend(marketId, rateBaseUnits, rateDecimals);
        processedEvents[eventId] = true;
        market.lastRateBaseUnits = rateBaseUnits;
        market.lastRateDecimals = rateDecimals;
        market.lastEventId = eventId;
        market.lastEventTimestamp = processedAt;
        market.lastSequence = sequence;
        dividendEvents[eventId] = DividendEvent(marketId, eventId, rateBaseUnits, rateDecimals, processedAt, sequence);
        emit DividendProcessed(marketId, eventId, rateBaseUnits, rateDecimals, sequence);
    }

    function getMarket(bytes32 marketId) external view returns (MarketConfig memory) {
        return markets[marketId];
    }

    function _isAdminOrOperator(address account) internal view returns (bool) {
        return accessManager.hasRole(ADMIN_ROLE, account) || accessManager.hasRole(OPERATOR_ROLE, account);
    }

    modifier onlyAdminOrOperator() {
        if (!_isAdminOrOperator(msg.sender)) revert Unauthorized(msg.sender);
        _;
    }
}
