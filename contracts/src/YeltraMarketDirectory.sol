// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IYeltraMarketDirectoryAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title YeltraMarketDirectory
/// @notice Generic YELTRA directory for verified external yield markets.
/// @dev Provider-specific semantics stay in off-chain/provider adapters. This contract only stores
///      the canonical identity and minimum routing metadata required to discover a market safely.
contract YeltraMarketDirectory {
    bytes32 public constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");

    struct MarketRecord {
        bytes32 marketId;
        bytes32 providerId;
        bytes32 marketType;
        address marketAddress;
        address underlyingAsset;
        uint256 chainId;
        bool enabled;
        uint256 registeredAt;
    }

    error DuplicateMarket(bytes32 marketId);
    error InvalidMarket();
    error MarketNotFound(bytes32 marketId);
    error Unauthorized(address caller);
    error ZeroAddress();

    IYeltraMarketDirectoryAccess public immutable accessManager;
    mapping(bytes32 => MarketRecord) private markets;
    mapping(address => bytes32) public marketIdForAddress;
    bytes32[] private marketIds;

    event MarketRegistered(
        bytes32 indexed marketId,
        bytes32 indexed providerId,
        bytes32 indexed marketType,
        address marketAddress,
        address underlyingAsset,
        uint256 chainId
    );
    event MarketEnabled(bytes32 indexed marketId, bool enabled);

    constructor(address accessManagerAddress) {
        if (accessManagerAddress == address(0)) revert ZeroAddress();
        accessManager = IYeltraMarketDirectoryAccess(accessManagerAddress);
    }

    function registerMarket(
        bytes32 marketId,
        bytes32 providerId,
        bytes32 marketType,
        address marketAddress,
        address underlyingAsset,
        uint256 chainId
    ) external onlyAdminOrOperator {
        if (
            marketId == bytes32(0) || providerId == bytes32(0) || marketType == bytes32(0)
                || marketAddress == address(0) || underlyingAsset == address(0) || chainId == 0
        ) revert InvalidMarket();
        if (markets[marketId].marketAddress != address(0) || marketIdForAddress[marketAddress] != bytes32(0)) {
            revert DuplicateMarket(marketId);
        }

        markets[marketId] = MarketRecord({
            marketId: marketId,
            providerId: providerId,
            marketType: marketType,
            marketAddress: marketAddress,
            underlyingAsset: underlyingAsset,
            chainId: chainId,
            enabled: true,
            registeredAt: block.timestamp
        });
        marketIdForAddress[marketAddress] = marketId;
        marketIds.push(marketId);
        emit MarketRegistered(marketId, providerId, marketType, marketAddress, underlyingAsset, chainId);
    }

    function setMarketEnabled(bytes32 marketId, bool enabled) external onlyAdminOrOperator {
        MarketRecord storage record = _requireMarket(marketId);
        record.enabled = enabled;
        emit MarketEnabled(marketId, enabled);
    }

    function getMarket(bytes32 marketId) external view returns (MarketRecord memory) {
        return _requireMarketView(marketId);
    }

    function allMarketIds() external view returns (bytes32[] memory) {
        return marketIds;
    }

    function isRegisteredMarket(address marketAddress) external view returns (bool) {
        return marketIdForAddress[marketAddress] != bytes32(0);
    }

    function isMarketActive(bytes32 marketId) external view returns (bool) {
        MarketRecord memory record = _requireMarketView(marketId);
        return record.enabled && record.chainId == block.chainid;
    }

    function _requireMarket(bytes32 marketId) internal view returns (MarketRecord storage record) {
        record = markets[marketId];
        if (record.marketAddress == address(0)) revert MarketNotFound(marketId);
    }

    function _requireMarketView(bytes32 marketId) internal view returns (MarketRecord memory record) {
        record = markets[marketId];
        if (record.marketAddress == address(0)) revert MarketNotFound(marketId);
    }

    modifier onlyAdminOrOperator() {
        if (
            !accessManager.hasRole(ADMIN_ROLE, msg.sender) && !accessManager.hasRole(OPERATOR_ROLE, msg.sender)
        ) revert Unauthorized(msg.sender);
        _;
    }
}
