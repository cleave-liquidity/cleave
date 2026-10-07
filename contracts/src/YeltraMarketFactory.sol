// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraAccessManager} from "./YeltraAccessManager.sol";
import {YeltraMarket} from "./YeltraMarket.sol";
import {YeltraNativeMarketRegistry} from "./YeltraNativeMarketRegistry.sol";
import {YeltraPrincipalToken} from "./YeltraPrincipalToken.sol";
import {YeltraYieldSourceAdapter} from "./YeltraYieldSourceAdapter.sol";
import {YeltraYieldToken} from "./YeltraYieldToken.sol";

interface IYeltraSourceAsset {
    function asset() external view returns (address);
    function decimals() external view returns (uint8);
}

contract YeltraMarketFactory {
    bytes32 public constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");

    error InvalidAddress();
    error InvalidMaturity();
    error SourceNotApproved(address source);
    error Unauthorized(address caller);

    struct MarketRequest {
        bytes32 marketId;
        address sourceVault;
        uint256 maturity;
        string ptName;
        string ptSymbol;
        string ytName;
        string ytSymbol;
    }

    YeltraAccessManager public immutable accessManager;
    YeltraNativeMarketRegistry public immutable registry;
    address public immutable router;
    mapping(address => bool) public approvedSources;

    event SourceApprovalUpdated(address indexed source, bool approved);
    event NativeMarketCreated(
        bytes32 indexed marketId, address indexed market, address pt, address yt, address adapter, address source
    );

    constructor(address accessManagerAddress, address registryAddress, address routerAddress) {
        if (accessManagerAddress == address(0) || registryAddress == address(0) || routerAddress == address(0)) {
            revert InvalidAddress();
        }
        accessManager = YeltraAccessManager(accessManagerAddress);
        registry = YeltraNativeMarketRegistry(registryAddress);
        router = routerAddress;
    }

    function approveSource(address source, bool approved) external onlyAdminOrOperator {
        if (source == address(0)) revert InvalidAddress();
        approvedSources[source] = approved;
        emit SourceApprovalUpdated(source, approved);
    }

    function createMarket(MarketRequest calldata request)
        external
        onlyAdminOrOperator
        returns (address market, address pt, address yt, address adapter)
    {
        if (!approvedSources[request.sourceVault]) revert SourceNotApproved(request.sourceVault);
        if (request.marketId == bytes32(0) || request.maturity <= block.timestamp) revert InvalidMaturity();
        address underlying = IYeltraSourceAsset(request.sourceVault).asset();
        uint8 decimals = IYeltraSourceAsset(underlying).decimals();

        (YeltraPrincipalToken principalToken, YeltraYieldToken yieldToken) = _deployTokens(request, decimals);
        YeltraMarket nativeMarket =
            _deployMarket(underlying, request.maturity, address(principalToken), address(yieldToken));
        YeltraYieldSourceAdapter sourceAdapter = _deployAdapter(request.sourceVault, address(nativeMarket), underlying);

        principalToken.setMarket(address(nativeMarket));
        yieldToken.setMarket(address(nativeMarket));
        nativeMarket.configureSourceAdapter(address(sourceAdapter));
        YeltraNativeMarketRegistry.MarketConfig memory config;
        config.market = address(nativeMarket);
        config.pt = address(principalToken);
        config.yt = address(yieldToken);
        config.underlying = underlying;
        config.sourceAdapter = address(sourceAdapter);
        config.maturity = request.maturity;
        config.chainId = block.chainid;
        config.underlyingDecimals = decimals;
        _register(request.marketId, config);

        market = address(nativeMarket);
        pt = address(principalToken);
        yt = address(yieldToken);
        adapter = address(sourceAdapter);
        _emitCreated(request.marketId, config, request.sourceVault);
    }

    function _deployTokens(MarketRequest calldata request, uint8 decimals)
        private
        returns (YeltraPrincipalToken principalToken, YeltraYieldToken yieldToken)
    {
        principalToken = new YeltraPrincipalToken(request.ptName, request.ptSymbol, decimals, address(this));
        yieldToken = new YeltraYieldToken(request.ytName, request.ytSymbol, decimals, address(this));
    }

    function _deployMarket(address underlying, uint256 maturity, address pt, address yt)
        private
        returns (YeltraMarket nativeMarket)
    {
        nativeMarket = new YeltraMarket(address(accessManager), router, underlying, maturity, pt, yt);
    }

    function _deployAdapter(address sourceVault, address market, address underlying)
        private
        returns (YeltraYieldSourceAdapter sourceAdapter)
    {
        sourceAdapter = new YeltraYieldSourceAdapter(sourceVault, market, underlying);
    }

    function _register(bytes32 marketId, YeltraNativeMarketRegistry.MarketConfig memory config) private {
        registry.registerMarket(marketId, config);
    }

    function _emitCreated(bytes32 marketId, YeltraNativeMarketRegistry.MarketConfig memory config, address sourceVault)
        private
    {
        emit NativeMarketCreated(marketId, config.market, config.pt, config.yt, config.sourceAdapter, sourceVault);
    }

    modifier onlyAdminOrOperator() {
        if (!accessManager.hasRole(ADMIN_ROLE, msg.sender) && !accessManager.hasRole(OPERATOR_ROLE, msg.sender)) {
            revert Unauthorized(msg.sender);
        }
        _;
    }
}
