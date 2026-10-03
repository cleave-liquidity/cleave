// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "./CleaveAccessManager.sol";
import {CleaveAdapterRegistry} from "./CleaveAdapterRegistry.sol";

/// @title CleaveMarketRegistry
/// @notice Stores verified external market metadata; it never invents or deploys markets.
contract CleaveMarketRegistry {
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");

    struct MarketConfig {
        bytes32 adapterId;
        address market;
        address pt;
        address yt;
        address sy;
        address underlying;
        uint256 maturity;
        uint256 chainId;
        bool enabled;
    }

    error AdapterUnavailable(bytes32 adapterId);
    error InvalidMarket();
    error MarketNotFound(bytes32 marketId);
    error Unauthorized(address account);
    error ZeroAddress();

    event MarketRegistered(
        bytes32 indexed marketId,
        bytes32 indexed adapterId,
        address indexed market,
        uint256 chainId,
        uint256 maturity
    );
    event MarketStatusUpdated(bytes32 indexed marketId, bool enabled);

    CleaveAccessManager public immutable accessManager;
    CleaveAdapterRegistry public immutable adapterRegistry;
    mapping(bytes32 => MarketConfig) private markets;

    constructor(address accessManagerAddress, address adapterRegistryAddress) {
        if (accessManagerAddress == address(0) || adapterRegistryAddress == address(0)) revert ZeroAddress();
        accessManager = CleaveAccessManager(accessManagerAddress);
        adapterRegistry = CleaveAdapterRegistry(adapterRegistryAddress);
    }

    function registerMarket(
        bytes32 marketId,
        bytes32 adapterId,
        address market,
        address pt,
        address yt,
        address sy,
        address underlying,
        uint256 maturity,
        uint256 chainId
    ) external onlyAdminOrOperator {
        if (
            marketId == bytes32(0) ||
            adapterId == bytes32(0) ||
            market == address(0) ||
            pt == address(0) ||
            yt == address(0) ||
            sy == address(0) ||
            underlying == address(0) ||
            maturity == 0 ||
            chainId == 0
        ) revert InvalidMarket();
        if (!adapterRegistry.isAdapterEnabled(adapterId)) revert AdapterUnavailable(adapterId);

        markets[marketId] = MarketConfig({
            adapterId: adapterId,
            market: market,
            pt: pt,
            yt: yt,
            sy: sy,
            underlying: underlying,
            maturity: maturity,
            chainId: chainId,
            enabled: true
        });
        emit MarketRegistered(marketId, adapterId, market, chainId, maturity);
    }

    function setMarketEnabled(bytes32 marketId, bool enabled) external onlyAdminOrOperator {
        if (markets[marketId].market == address(0)) revert MarketNotFound(marketId);
        markets[marketId].enabled = enabled;
        emit MarketStatusUpdated(marketId, enabled);
    }

    function getMarket(bytes32 marketId) external view returns (MarketConfig memory) {
        return markets[marketId];
    }

    function isMarketSupported(bytes32 marketId) external view returns (bool) {
        MarketConfig memory marketConfig = markets[marketId];
        return marketConfig.enabled && marketConfig.market != address(0) && adapterRegistry.isAdapterEnabled(marketConfig.adapterId);
    }

    modifier onlyAdminOrOperator() {
        if (!accessManager.hasRole(ADMIN_ROLE, msg.sender) && !accessManager.hasRole(OPERATOR_ROLE, msg.sender)) {
            revert Unauthorized(msg.sender);
        }
        _;
    }
}
