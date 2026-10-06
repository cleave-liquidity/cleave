// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "./CleaveAccessManager.sol";

/// @title YeltraAccessManager
/// @notice YELTRA-named compatibility deployment of the unchanged role authority.
contract YeltraAccessManager is CleaveAccessManager {
    constructor(address initialAdmin) CleaveAccessManager(initialAdmin) {}
}
