// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraDividendDemoYieldToken} from "../src/YeltraDividendDemoYieldToken.sol";
import {YeltraDividendLens} from "../src/YeltraDividendLens.sol";
import {YeltraDividendRegistry} from "../src/YeltraDividendRegistry.sol";
import {YeltraDividendAccounting} from "../src/YeltraDividendAccounting.sol";

interface VmDividendDemoIntegration {
    function chainId(uint256 newChainId) external;
    function prank(address caller) external;
}

contract DividendDemoIntegrationAccess {
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    mapping(address => bool) public operators;

    function setOperator(address account) external {
        operators[account] = true;
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return role == OPERATOR_ROLE && operators[account];
    }
}

contract YeltraDividendDemoIntegrationTest {
    VmDividendDemoIntegration private constant vm =
        VmDividendDemoIntegration(address(uint160(uint256(keccak256("hevm cheat code")))));
    bytes32 private constant MARKET_ID = keccak256("YELTRA-DEVELOPMENT-NVDA-46630");
    bytes32 private constant POSITION_DOMAIN = keccak256("YELTRA_DIVIDEND_DEMO_POSITION_V1");

    function testFreshAuthorizedReferenceEventAccruesHalfUnitAfterOwnerOptIn() external {
        vm.chainId(46630);
        address demoWallet = address(0xBEEF);
        DividendDemoIntegrationAccess access = new DividendDemoIntegrationAccess();
        access.setOperator(address(this));
        YeltraDividendDemoYieldToken token =
            new YeltraDividendDemoYieldToken(address(access), demoWallet);
        token.mintDevelopmentPosition();

        YeltraDividendRegistry registry = new YeltraDividendRegistry(address(access));
        registry.configureMarket(MARKET_ID, address(token), address(token), 18, 6, 0);
        bytes32 positionId = keccak256(
            abi.encode(POSITION_DOMAIN, block.chainid, demoWallet, address(token))
        );
        registry.registerPosition(positionId, MARKET_ID, demoWallet, token.balanceOf(demoWallet), uint64(block.timestamp));

        YeltraDividendAccounting accounting = registry.accounting();
        vm.prank(demoWallet);
        accounting.enablePosition(positionId, true);

        bytes32 freshEventId = keccak256(abi.encode("DEMO_EVENT", block.chainid, positionId, uint64(1)));
        registry.processDividend(MARKET_ID, freshEventId, address(token), 25, 2, uint64(block.timestamp), 1);

        YeltraDividendLens lens = new YeltraDividendLens(address(registry));
        YeltraDividendLens.State memory state = lens.dividendState(MARKET_ID, positionId);
        require(state.eligible, "position eligible");
        require(state.enabled, "position enabled");
        require(state.accruedBaseUnits == 500_000, "0.500000 reference accounting");
        require(uint8(state.status) == 3, "settlement pending status");
        require(!state.settlementEnabled, "settlement disabled");
        require(registry.processedEvents(freshEventId), "event recorded");
    }
}
