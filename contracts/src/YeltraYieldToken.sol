// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraSplitToken} from "./YeltraSplitToken.sol";

contract YeltraYieldToken is YeltraSplitToken {
    constructor(string memory name_, string memory symbol_, uint8 decimals_, address controller_)
        YeltraSplitToken(name_, symbol_, decimals_, controller_, false)
    {}
}
