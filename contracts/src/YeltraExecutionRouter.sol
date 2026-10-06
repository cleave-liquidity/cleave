// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveExecutionRouter} from "./CleaveExecutionRouter.sol";

/// @title YeltraExecutionRouter
/// @notice YELTRA-named compatibility deployment of the unchanged execution boundary.
contract YeltraExecutionRouter is CleaveExecutionRouter {
    constructor(
        address accessManagerAddress,
        address adapterRegistryAddress,
        address marketRegistryAddress,
        address riskGuardAddress
    )
        CleaveExecutionRouter(
            accessManagerAddress,
            adapterRegistryAddress,
            marketRegistryAddress,
            riskGuardAddress
        )
    {}
}
