// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveMarketRegistry} from "./CleaveMarketRegistry.sol";

/// @title YeltraMarketRegistry
/// @notice YELTRA-named compatibility deployment of the unchanged market registry.
contract YeltraMarketRegistry is CleaveMarketRegistry {
    constructor(address accessManagerAddress, address adapterRegistryAddress)
        CleaveMarketRegistry(accessManagerAddress, adapterRegistryAddress)
    {}
}
