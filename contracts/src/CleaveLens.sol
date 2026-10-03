// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAdapterRegistry} from "./CleaveAdapterRegistry.sol";
import {CleaveExecutionRouter} from "./CleaveExecutionRouter.sol";
import {CleaveLifecycleManager} from "./CleaveLifecycleManager.sol";
import {CleaveMarketRegistry} from "./CleaveMarketRegistry.sol";
import {CleaveRiskGuard} from "./CleaveRiskGuard.sol";

/// @title CleaveLens
/// @notice Read-only aggregation for frontend and deployment diagnostics.
contract CleaveLens {
    struct ProtocolModules {
        address registry;
        address accessManager;
        address adapterRegistry;
        address marketRegistry;
        address riskGuard;
        address executionRouter;
        address lifecycleManager;
    }

    struct MarketSummary {
        bytes32 adapterId;
        address market;
        address pt;
        address yt;
        address sy;
        address underlying;
        uint256 maturity;
        uint256 chainId;
        bool marketEnabled;
        bool adapterEnabled;
        bool globalPaused;
        bool marketPaused;
        bool adapterPaused;
        bool executionAllowed;
        uint8 fixedState;
        uint8 tradingYieldState;
        bool fixedSellEarlyEligible;
        bool fixedRedeemAtMaturityEligible;
        bool tradingYieldSellEarlyEligible;
        bool tradingYieldClaimYieldEligible;
    }

    error ZeroAddress();

    address public immutable registry;
    address public immutable accessManager;
    CleaveAdapterRegistry public immutable adapterRegistry;
    CleaveMarketRegistry public immutable marketRegistry;
    CleaveRiskGuard public immutable riskGuard;
    CleaveExecutionRouter public immutable executionRouter;
    CleaveLifecycleManager public immutable lifecycleManager;

    constructor(
        address registryAddress,
        address accessManagerAddress,
        address adapterRegistryAddress,
        address marketRegistryAddress,
        address riskGuardAddress,
        address executionRouterAddress,
        address lifecycleManagerAddress
    ) {
        if (
            registryAddress == address(0) ||
            accessManagerAddress == address(0) ||
            adapterRegistryAddress == address(0) ||
            marketRegistryAddress == address(0) ||
            riskGuardAddress == address(0) ||
            executionRouterAddress == address(0) ||
            lifecycleManagerAddress == address(0)
        ) revert ZeroAddress();
        registry = registryAddress;
        accessManager = accessManagerAddress;
        adapterRegistry = CleaveAdapterRegistry(adapterRegistryAddress);
        marketRegistry = CleaveMarketRegistry(marketRegistryAddress);
        riskGuard = CleaveRiskGuard(riskGuardAddress);
        executionRouter = CleaveExecutionRouter(executionRouterAddress);
        lifecycleManager = CleaveLifecycleManager(lifecycleManagerAddress);
    }

    function getProtocolModules() external view returns (ProtocolModules memory modules) {
        modules = ProtocolModules({
            registry: registry,
            accessManager: accessManager,
            adapterRegistry: address(adapterRegistry),
            marketRegistry: address(marketRegistry),
            riskGuard: address(riskGuard),
            executionRouter: address(executionRouter),
            lifecycleManager: address(lifecycleManager)
        });
    }

    function getMarketSummary(bytes32 marketId) external view returns (MarketSummary memory summary) {
        CleaveMarketRegistry.MarketConfig memory marketConfig = marketRegistry.getMarket(marketId);
        CleaveAdapterRegistry.AdapterConfig memory adapterConfig = adapterRegistry.getAdapter(marketConfig.adapterId);
        CleaveLifecycleManager.LifecycleStateView memory fixedLifecycle = lifecycleManager.getLifecycle(
            marketId,
            CleaveLifecycleManager.Strategy.FixedYield
        );
        CleaveLifecycleManager.LifecycleStateView memory tradingYieldLifecycle = lifecycleManager.getLifecycle(
            marketId,
            CleaveLifecycleManager.Strategy.TradingYield
        );
        (bool executionAllowed,,) = executionRouter.validateExecution(marketId);

        summary = MarketSummary({
            adapterId: marketConfig.adapterId,
            market: marketConfig.market,
            pt: marketConfig.pt,
            yt: marketConfig.yt,
            sy: marketConfig.sy,
            underlying: marketConfig.underlying,
            maturity: marketConfig.maturity,
            chainId: marketConfig.chainId,
            marketEnabled: marketConfig.enabled && marketConfig.market != address(0),
            adapterEnabled: adapterConfig.enabled && adapterConfig.router != address(0),
            globalPaused: riskGuard.globalPaused(),
            marketPaused: riskGuard.marketPaused(marketId),
            adapterPaused: riskGuard.adapterPaused(marketConfig.adapterId),
            executionAllowed: executionAllowed,
            fixedState: uint8(fixedLifecycle.state),
            tradingYieldState: uint8(tradingYieldLifecycle.state),
            fixedSellEarlyEligible: fixedLifecycle.sellEarlyEligible,
            fixedRedeemAtMaturityEligible: fixedLifecycle.redeemAtMaturityEligible,
            tradingYieldSellEarlyEligible: tradingYieldLifecycle.sellEarlyEligible,
            tradingYieldClaimYieldEligible: tradingYieldLifecycle.claimYieldEligible
        });
    }
}
