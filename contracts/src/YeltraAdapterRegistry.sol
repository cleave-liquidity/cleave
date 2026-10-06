// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAdapterRegistry} from "./CleaveAdapterRegistry.sol";

/// @title YeltraAdapterRegistry
/// @notice YELTRA-named compatibility deployment of the unchanged adapter registry.
contract YeltraAdapterRegistry is CleaveAdapterRegistry {
    constructor(address accessManagerAddress) CleaveAdapterRegistry(accessManagerAddress) {}
}
