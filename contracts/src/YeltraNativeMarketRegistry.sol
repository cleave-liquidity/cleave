// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IYeltraRegistryAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

contract YeltraNativeMarketRegistry {
    bytes32 public constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");

    struct MarketConfig {
        address market;
        address pt;
        address yt;
        address underlying;
        address sourceAdapter;
        uint256 maturity;
        uint256 chainId;
        uint8 underlyingDecimals;
        uint256 createdAt;
        uint256 createdBlock;
        bool enabled;
        bool paused;
    }

    error DuplicateMarket(bytes32 key);
    error InvalidMarket();
    error MarketNotFound(bytes32 marketId);
    error Unauthorized(address caller);
    error ZeroAddress();

    IYeltraRegistryAccess public immutable accessManager;
    address public factory;
    mapping(bytes32 => MarketConfig) private markets;
    mapping(bytes32 => bool) public sourceMaturityUsed;
    mapping(address => bytes32) public marketIdForAddress;
    bytes32[] private marketIds;

    event FactoryUpdated(address indexed factory);
    event MarketRegistered(
        bytes32 indexed marketId, address indexed market, address indexed sourceAdapter, uint256 maturity
    );
    event MarketEnabled(bytes32 indexed marketId, bool enabled);
    event MarketPaused(bytes32 indexed marketId, bool paused);

    constructor(address accessManagerAddress) {
        if (accessManagerAddress == address(0)) revert ZeroAddress();
        accessManager = IYeltraRegistryAccess(accessManagerAddress);
    }

    function setFactory(address factoryAddress) external onlyAdmin {
        if (factoryAddress == address(0)) revert ZeroAddress();
        if (factory != address(0)) revert InvalidMarket();
        factory = factoryAddress;
        emit FactoryUpdated(factoryAddress);
    }

    function registerMarket(bytes32 marketId, MarketConfig calldata supplied) external onlyFactory {
        if (
            marketId == bytes32(0) || supplied.market == address(0) || supplied.pt == address(0)
                || supplied.yt == address(0) || supplied.underlying == address(0)
                || supplied.sourceAdapter == address(0) || supplied.maturity == 0 || supplied.chainId == 0
        ) revert InvalidMarket();
        bytes32 sourceKey = keccak256(abi.encode(supplied.underlying, supplied.sourceAdapter, supplied.maturity));
        if (sourceMaturityUsed[sourceKey]) revert DuplicateMarket(sourceKey);
        if (markets[marketId].market != address(0) || marketIdForAddress[supplied.market] != bytes32(0)) {
            revert DuplicateMarket(marketId);
        }

        sourceMaturityUsed[sourceKey] = true;
        marketIdForAddress[supplied.market] = marketId;
        marketIds.push(marketId);
        markets[marketId] = MarketConfig({
            market: supplied.market,
            pt: supplied.pt,
            yt: supplied.yt,
            underlying: supplied.underlying,
            sourceAdapter: supplied.sourceAdapter,
            maturity: supplied.maturity,
            chainId: supplied.chainId,
            underlyingDecimals: supplied.underlyingDecimals,
            createdAt: block.timestamp,
            createdBlock: block.number,
            enabled: true,
            paused: false
        });
        emit MarketRegistered(marketId, supplied.market, supplied.sourceAdapter, supplied.maturity);
    }

    function setMarketEnabled(bytes32 marketId, bool enabled) external onlyAdminOrOperator {
        _requireMarket(marketId).enabled = enabled;
        emit MarketEnabled(marketId, enabled);
    }

    function setMarketPaused(bytes32 marketId, bool paused) external onlyAdminOrOperator {
        _requireMarket(marketId).paused = paused;
        emit MarketPaused(marketId, paused);
    }

    function getMarket(bytes32 marketId) external view returns (MarketConfig memory) {
        return _requireMarketView(marketId);
    }

    function allMarketIds() external view returns (bytes32[] memory) {
        return marketIds;
    }

    function isRegisteredMarket(address market) external view returns (bool) {
        return marketIdForAddress[market] != bytes32(0);
    }

    function isMarketActive(bytes32 marketId) public view returns (bool) {
        MarketConfig memory config = _requireMarketView(marketId);
        return config.enabled && !config.paused && block.chainid == config.chainId && block.timestamp < config.maturity;
    }

    function _requireMarket(bytes32 marketId) internal view returns (MarketConfig storage config) {
        config = markets[marketId];
        if (config.market == address(0)) revert MarketNotFound(marketId);
    }

    function _requireMarketView(bytes32 marketId) internal view returns (MarketConfig memory config) {
        config = markets[marketId];
        if (config.market == address(0)) revert MarketNotFound(marketId);
    }

    modifier onlyFactory() {
        if (msg.sender != factory || factory == address(0)) revert Unauthorized(msg.sender);
        _;
    }

    modifier onlyAdmin() {
        if (!accessManager.hasRole(ADMIN_ROLE, msg.sender)) revert Unauthorized(msg.sender);
        _;
    }

    modifier onlyAdminOrOperator() {
        if (!accessManager.hasRole(ADMIN_ROLE, msg.sender) && !accessManager.hasRole(OPERATOR_ROLE, msg.sender)) {
            revert Unauthorized(msg.sender);
        }
        _;
    }
}
