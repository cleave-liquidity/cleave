// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveRegistry} from "./CleaveRegistry.sol";

/// @title YeltraRegistry
/// @notice YELTRA-named compatibility deployment of the unchanged configuration anchor.
contract YeltraRegistry is CleaveRegistry {
    constructor(address initialOwner) CleaveRegistry(initialOwner) {}
}
