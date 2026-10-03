// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CleaveAccessManager
/// @notice Small role authority shared by the CLEAVE-owned protocol modules.
contract CleaveAccessManager {
    bytes32 public constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 public constant GUARDIAN_ROLE = keccak256("CLEAVE_GUARDIAN");

    error InvalidRole(bytes32 role);
    error Unauthorized(bytes32 role, address account);
    error ZeroAddress();

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    mapping(bytes32 => mapping(address => bool)) private roles;

    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert ZeroAddress();
        _grantRole(ADMIN_ROLE, initialAdmin, initialAdmin);
        _grantRole(OPERATOR_ROLE, initialAdmin, initialAdmin);
        _grantRole(GUARDIAN_ROLE, initialAdmin, initialAdmin);
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _isManagedRole(role) && roles[role][account];
    }

    function grantRole(bytes32 role, address account) external onlyAdmin {
        if (!_isManagedRole(role)) revert InvalidRole(role);
        if (account == address(0)) revert ZeroAddress();
        _grantRole(role, account, msg.sender);
    }

    function revokeRole(bytes32 role, address account) external onlyAdmin {
        if (!_isManagedRole(role)) revert InvalidRole(role);
        if (account == address(0)) revert ZeroAddress();
        if (roles[role][account]) {
            roles[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    modifier onlyAdmin() {
        if (!roles[ADMIN_ROLE][msg.sender]) revert Unauthorized(ADMIN_ROLE, msg.sender);
        _;
    }

    function _grantRole(bytes32 role, address account, address sender) internal {
        if (!roles[role][account]) {
            roles[role][account] = true;
            emit RoleGranted(role, account, sender);
        }
    }

    function _isManagedRole(bytes32 role) internal pure returns (bool) {
        return role == ADMIN_ROLE || role == OPERATOR_ROLE || role == GUARDIAN_ROLE;
    }
}
