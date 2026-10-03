// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "../src/CleaveAccessManager.sol";

contract AccessManagerCaller {
    function grant(address manager, bytes32 role, address account) external returns (bool) {
        (bool success,) = manager.call(abi.encodeWithSelector(CleaveAccessManager.grantRole.selector, role, account));
        return success;
    }
}

contract CleaveAccessManagerTest {
    CleaveAccessManager private manager;
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 private constant GUARDIAN_ROLE = keccak256("CLEAVE_GUARDIAN");

    function setUp() public {
        manager = new CleaveAccessManager(address(this));
    }

    function testInitialAdminOwnsAllOperationalRoles() public view {
        assert(manager.hasRole(ADMIN_ROLE, address(this)));
        assert(manager.hasRole(OPERATOR_ROLE, address(this)));
        assert(manager.hasRole(GUARDIAN_ROLE, address(this)));
    }

    function testAdminCanGrantAndRevokeOperator() public {
        address operator = address(uint160(0x2001));
        manager.grantRole(OPERATOR_ROLE, operator);
        assert(manager.hasRole(OPERATOR_ROLE, operator));
        manager.revokeRole(OPERATOR_ROLE, operator);
        assert(!manager.hasRole(OPERATOR_ROLE, operator));
    }

    function testNonAdminCannotGrantRole() public {
        AccessManagerCaller caller = new AccessManagerCaller();
        assert(!caller.grant(address(manager), OPERATOR_ROLE, address(uint160(0x2002))));
    }
}
