// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "./CleaveAccessManager.sol";

/// @title CleaveRiskGuard
/// @notice Non-custodial pause controls used by the CLEAVE execution boundary.
contract CleaveRiskGuard {
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant GUARDIAN_ROLE = keccak256("CLEAVE_GUARDIAN");

    error Unauthorized(address account);
    error ZeroAddress();

    event GlobalPauseUpdated(bool paused, address indexed sender);
    event MarketPauseUpdated(bytes32 indexed marketId, bool paused, address indexed sender);
    event AdapterPauseUpdated(bytes32 indexed adapterId, bool paused, address indexed sender);

    CleaveAccessManager public immutable accessManager;
    bool public globalPaused;
    mapping(bytes32 => bool) public marketPaused;
    mapping(bytes32 => bool) public adapterPaused;

    constructor(address accessManagerAddress) {
        if (accessManagerAddress == address(0)) revert ZeroAddress();
        accessManager = CleaveAccessManager(accessManagerAddress);
    }

    function setGlobalPause(bool paused) external onlyAdminOrGuardian {
        globalPaused = paused;
        emit GlobalPauseUpdated(paused, msg.sender);
    }

    function setMarketPause(bytes32 marketId, bool paused) external onlyAdminOrGuardian {
        marketPaused[marketId] = paused;
        emit MarketPauseUpdated(marketId, paused, msg.sender);
    }

    function setAdapterPause(bytes32 adapterId, bool paused) external onlyAdminOrGuardian {
        adapterPaused[adapterId] = paused;
        emit AdapterPauseUpdated(adapterId, paused, msg.sender);
    }

    function isExecutionAllowed(bytes32 marketId, bytes32 adapterId) external view returns (bool) {
        return !globalPaused && !marketPaused[marketId] && !adapterPaused[adapterId];
    }

    modifier onlyAdminOrGuardian() {
        if (!accessManager.hasRole(ADMIN_ROLE, msg.sender) && !accessManager.hasRole(GUARDIAN_ROLE, msg.sender)) {
            revert Unauthorized(msg.sender);
        }
        _;
    }
}
