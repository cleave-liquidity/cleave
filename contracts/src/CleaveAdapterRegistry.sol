// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "./CleaveAccessManager.sol";

/// @title CleaveAdapterRegistry
/// @notice Records approved external yield protocol integrations without executing them.
contract CleaveAdapterRegistry {
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");

    struct AdapterConfig {
        bytes32 protocolId;
        address router;
        uint256 chainId;
        bool enabled;
    }

    error AdapterNotFound(bytes32 adapterId);
    error InvalidAdapter();
    error Unauthorized(address account);
    error ZeroAddress();

    event AdapterRegistered(
        bytes32 indexed adapterId,
        bytes32 indexed protocolId,
        address indexed router,
        uint256 chainId
    );
    event AdapterStatusUpdated(bytes32 indexed adapterId, bool enabled);

    CleaveAccessManager public immutable accessManager;
    mapping(bytes32 => AdapterConfig) private adapters;

    constructor(address accessManagerAddress) {
        if (accessManagerAddress == address(0)) revert ZeroAddress();
        accessManager = CleaveAccessManager(accessManagerAddress);
    }

    function registerAdapter(
        bytes32 adapterId,
        bytes32 protocolId,
        address router,
        uint256 chainId
    ) external onlyAdminOrOperator {
        if (adapterId == bytes32(0) || protocolId == bytes32(0) || router == address(0) || chainId == 0) {
            revert InvalidAdapter();
        }
        adapters[adapterId] = AdapterConfig({
            protocolId: protocolId,
            router: router,
            chainId: chainId,
            enabled: true
        });
        emit AdapterRegistered(adapterId, protocolId, router, chainId);
    }

    function setAdapterEnabled(bytes32 adapterId, bool enabled) external onlyAdminOrOperator {
        if (adapters[adapterId].router == address(0)) revert AdapterNotFound(adapterId);
        adapters[adapterId].enabled = enabled;
        emit AdapterStatusUpdated(adapterId, enabled);
    }

    function getAdapter(bytes32 adapterId) external view returns (AdapterConfig memory) {
        return adapters[adapterId];
    }

    function isAdapterEnabled(bytes32 adapterId) external view returns (bool) {
        return adapters[adapterId].enabled && adapters[adapterId].router != address(0);
    }

    modifier onlyAdminOrOperator() {
        if (!accessManager.hasRole(ADMIN_ROLE, msg.sender) && !accessManager.hasRole(OPERATOR_ROLE, msg.sender)) {
            revert Unauthorized(msg.sender);
        }
        _;
    }
}
