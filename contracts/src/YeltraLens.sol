// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveLens} from "./CleaveLens.sol";

/// @title YeltraLens
/// @notice YELTRA-named compatibility deployment of the unchanged read surface.
contract YeltraLens is CleaveLens {
    constructor(
        address registryAddress,
        address accessManagerAddress,
        address adapterRegistryAddress,
        address marketRegistryAddress,
        address riskGuardAddress,
        address executionRouterAddress,
        address lifecycleManagerAddress
    )
        CleaveLens(
            registryAddress,
            accessManagerAddress,
            adapterRegistryAddress,
            marketRegistryAddress,
            riskGuardAddress,
            executionRouterAddress,
            lifecycleManagerAddress
        )
    {}
}
