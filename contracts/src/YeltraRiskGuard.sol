// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveRiskGuard} from "./CleaveRiskGuard.sol";

/// @title YeltraRiskGuard
/// @notice YELTRA-named compatibility deployment of the unchanged risk guard.
contract YeltraRiskGuard is CleaveRiskGuard {
    constructor(address accessManagerAddress) CleaveRiskGuard(accessManagerAddress) {}
}
