// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "./CleaveAccessManager.sol";
import {CleaveAdapterRegistry} from "./CleaveAdapterRegistry.sol";
import {CleaveMarketRegistry} from "./CleaveMarketRegistry.sol";
import {CleaveRiskGuard} from "./CleaveRiskGuard.sol";

/// @title CleaveExecutionRouter
/// @notice Validated CLEAVE execution boundary; it performs no arbitrary external calls.
contract CleaveExecutionRouter {
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");

    error ExecutionNotAllowed(bytes32 marketId);
    error Unauthorized(address account);
    error ZeroAddress();

    event ExecutionValidated(
        bytes32 indexed marketId,
        bytes32 indexed adapterId,
        bytes32 indexed operation,
        address externalRouter,
        address caller
    );

    CleaveAccessManager public immutable accessManager;
    CleaveAdapterRegistry public immutable adapterRegistry;
    CleaveMarketRegistry public immutable marketRegistry;
    CleaveRiskGuard public immutable riskGuard;

    constructor(
        address accessManagerAddress,
        address adapterRegistryAddress,
        address marketRegistryAddress,
        address riskGuardAddress
    ) {
        if (
            accessManagerAddress == address(0) ||
            adapterRegistryAddress == address(0) ||
            marketRegistryAddress == address(0) ||
            riskGuardAddress == address(0)
        ) revert ZeroAddress();
        accessManager = CleaveAccessManager(accessManagerAddress);
        adapterRegistry = CleaveAdapterRegistry(adapterRegistryAddress);
        marketRegistry = CleaveMarketRegistry(marketRegistryAddress);
        riskGuard = CleaveRiskGuard(riskGuardAddress);
    }

    function validateExecution(bytes32 marketId)
        public
        view
        returns (bool allowed, bytes32 adapterId, address externalRouter)
    {
        CleaveMarketRegistry.MarketConfig memory marketConfig = marketRegistry.getMarket(marketId);
        adapterId = marketConfig.adapterId;
        if (!marketConfig.enabled || marketConfig.market == address(0)) return (false, adapterId, address(0));

        CleaveAdapterRegistry.AdapterConfig memory adapterConfig = adapterRegistry.getAdapter(adapterId);
        if (!adapterConfig.enabled || adapterConfig.router == address(0)) return (false, adapterId, address(0));
        if (adapterConfig.chainId != marketConfig.chainId) return (false, adapterId, address(0));
        if (!riskGuard.isExecutionAllowed(marketId, adapterId)) return (false, adapterId, address(0));

        return (true, adapterId, adapterConfig.router);
    }

    function recordValidatedExecution(bytes32 marketId, bytes32 operation)
        external
        onlyAdminOrOperator
        returns (address externalRouter)
    {
        (bool allowed, bytes32 adapterId, address router) = validateExecution(marketId);
        if (!allowed) revert ExecutionNotAllowed(marketId);
        emit ExecutionValidated(marketId, adapterId, operation, router, msg.sender);
        return router;
    }

    modifier onlyAdminOrOperator() {
        if (!accessManager.hasRole(ADMIN_ROLE, msg.sender) && !accessManager.hasRole(OPERATOR_ROLE, msg.sender)) {
            revert Unauthorized(msg.sender);
        }
        _;
    }
}
