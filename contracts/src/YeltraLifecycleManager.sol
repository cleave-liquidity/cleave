// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveLifecycleManager} from "./CleaveLifecycleManager.sol";

/// @title YeltraLifecycleManager
/// @notice YELTRA-named compatibility deployment of the unchanged lifecycle rules.
contract YeltraLifecycleManager is CleaveLifecycleManager {
    constructor(address marketRegistryAddress) CleaveLifecycleManager(marketRegistryAddress) {}
}
