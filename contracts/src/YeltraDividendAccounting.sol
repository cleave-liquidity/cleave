// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IYeltraDividendAccountingAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title YeltraDividendAccounting
/// @notice Fixed-point Dividend Earn accounting keyed to registered Trading Yield positions.
/// @dev This contract records entitlement only. It deliberately has no reward-transfer or claim
///      function until a funded, transferable settlement module is proven and attached.
contract YeltraDividendAccounting {
    uint256 public constant INDEX_SCALE = 1e27;
    bytes32 public constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");

    struct MarketState {
        uint256 index;
        uint8 exposureDecimals;
        uint8 rewardDecimals;
        bool enabled;
    }

    struct PositionState {
        bytes32 marketId;
        address owner;
        uint256 exposureBaseUnits;
        uint256 lastIndex;
        uint256 accruedBaseUnits;
        uint64 openedAt;
        bool enabled;
        bool closed;
    }

    error InvalidAddress();
    error InvalidDecimals();
    error InvalidMarket();
    error InvalidPosition();
    error Unauthorized(address caller);
    error NotPositionOwner(address caller);
    error AlreadyRegistered(bytes32 id);
    error InvalidRate();

    IYeltraDividendAccountingAccess public immutable accessManager;
    address public immutable registry;
    mapping(bytes32 => MarketState) public markets;
    mapping(bytes32 => PositionState) public positions;

    event MarketConfigured(bytes32 indexed marketId, uint8 exposureDecimals, uint8 rewardDecimals, bool enabled);
    event PositionRegistered(bytes32 indexed positionId, bytes32 indexed marketId, address indexed owner, uint256 exposureBaseUnits);
    event PositionEnabled(bytes32 indexed positionId, bool enabled);
    event PositionExposureUpdated(bytes32 indexed positionId, uint256 exposureBaseUnits, bool closed);
    event DividendIndexApplied(bytes32 indexed marketId, uint256 rateBaseUnits, uint8 rateDecimals, uint256 index);

    constructor(address accessManagerAddress, address registryAddress) {
        if (accessManagerAddress == address(0) || registryAddress == address(0)) revert InvalidAddress();
        accessManager = IYeltraDividendAccountingAccess(accessManagerAddress);
        registry = registryAddress;
    }

    function configureMarket(bytes32 marketId, uint8 exposureDecimals, uint8 rewardDecimals, bool enabled)
        external
        onlyRegistry
    {
        if (marketId == bytes32(0)) revert InvalidMarket();
        if (exposureDecimals > 36 || rewardDecimals > 36) revert InvalidDecimals();
        markets[marketId] = MarketState(0, exposureDecimals, rewardDecimals, enabled);
        emit MarketConfigured(marketId, exposureDecimals, rewardDecimals, enabled);
    }

    function setMarketEnabled(bytes32 marketId, bool enabled) external onlyRegistry {
        if (markets[marketId].exposureDecimals == 0 && markets[marketId].rewardDecimals == 0) revert InvalidMarket();
        markets[marketId].enabled = enabled;
    }

    function registerPosition(
        bytes32 positionId,
        bytes32 marketId,
        address owner,
        uint256 exposureBaseUnits,
        uint64 openedAt
    ) external onlyRegistry {
        if (
            positionId == bytes32(0) || owner == address(0) || marketId == bytes32(0)
                || exposureBaseUnits == 0 || openedAt == 0
        ) revert InvalidPosition();
        if (positions[positionId].owner != address(0)) revert AlreadyRegistered(positionId);
        MarketState memory market = markets[marketId];
        if (!market.enabled) revert InvalidMarket();
        positions[positionId] = PositionState({
            marketId: marketId,
            owner: owner,
            exposureBaseUnits: exposureBaseUnits,
            lastIndex: market.index,
            accruedBaseUnits: 0,
            openedAt: openedAt,
            enabled: false,
            closed: false
        });
        emit PositionRegistered(positionId, marketId, owner, exposureBaseUnits);
    }

    function enablePosition(bytes32 positionId, bool enabled) external {
        PositionState storage position = positions[positionId];
        if (position.owner == address(0)) revert InvalidPosition();
        if (position.owner != msg.sender) revert NotPositionOwner(msg.sender);
        if (enabled && position.closed) revert InvalidPosition();
        if (enabled) {
            // Explicit opt-in starts a fresh accrual window. Events processed before
            // activation are not retroactively claimable by the position.
            position.lastIndex = markets[position.marketId].index;
        } else {
            _sync(position);
        }
        position.enabled = enabled;
        emit PositionEnabled(positionId, enabled);
    }

    function updatePositionExposure(bytes32 positionId, uint256 exposureBaseUnits, bool closed) external onlyRegistry {
        PositionState storage position = positions[positionId];
        if (position.owner == address(0)) revert InvalidPosition();
        _sync(position);
        position.exposureBaseUnits = exposureBaseUnits;
        position.closed = closed;
        emit PositionExposureUpdated(positionId, exposureBaseUnits, closed);
    }

    function syncPosition(bytes32 positionId) external {
        PositionState storage position = positions[positionId];
        if (position.owner == address(0)) revert InvalidPosition();
        if (position.owner != msg.sender && !accessManager.hasRole(OPERATOR_ROLE, msg.sender)) {
            revert Unauthorized(msg.sender);
        }
        _sync(position);
    }

    function applyDividend(bytes32 marketId, uint256 rateBaseUnits, uint8 rateDecimals)
        external
        onlyRegistry
        returns (uint256 newIndex)
    {
        MarketState storage market = markets[marketId];
        if (!market.enabled) revert InvalidMarket();
        if (rateDecimals > 36) revert InvalidDecimals();
        uint256 rateScale = 10 ** uint256(rateDecimals);
        if (rateBaseUnits > rateScale * 1_000) revert InvalidRate();

        uint256 outputScale = 10 ** uint256(market.rewardDecimals);
        uint256 exposureScale = 10 ** uint256(market.exposureDecimals);
        uint256 increment = rateBaseUnits * outputScale * INDEX_SCALE / (rateScale * exposureScale);
        market.index += increment;
        emit DividendIndexApplied(marketId, rateBaseUnits, rateDecimals, market.index);
        return market.index;
    }

    function previewAccrued(bytes32 positionId) public view returns (uint256) {
        PositionState memory position = positions[positionId];
        if (position.owner == address(0)) revert InvalidPosition();
        MarketState memory market = markets[position.marketId];
        uint256 pending = position.enabled && !position.closed && market.index > position.lastIndex
            ? position.exposureBaseUnits * (market.index - position.lastIndex) / INDEX_SCALE
            : 0;
        return position.accruedBaseUnits + pending;
    }

    function getPosition(bytes32 positionId) external view returns (PositionState memory) {
        return positions[positionId];
    }

    function settlementEnabled() external pure returns (bool) {
        return false;
    }

    function _sync(PositionState storage position) internal {
        MarketState memory market = markets[position.marketId];
        if (position.enabled && !position.closed && market.index > position.lastIndex) {
            position.accruedBaseUnits += position.exposureBaseUnits * (market.index - position.lastIndex) / INDEX_SCALE;
        }
        position.lastIndex = market.index;
    }

    modifier onlyRegistry() {
        if (msg.sender != registry) revert Unauthorized(msg.sender);
        _;
    }
}
