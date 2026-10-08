// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraAccessManager} from "../src/YeltraAccessManager.sol";
import {YeltraTestnetDevelopmentCollateral} from "../src/YeltraTestnetDevelopmentCollateral.sol";

interface VmYeltraDevelopmentCollateral {
    function chainId(uint256 newChainId) external;
    function startPrank(address sender) external;
    function stopPrank() external;
    function expectRevert() external;
}

contract YeltraTestnetDevelopmentCollateralTest {
    VmYeltraDevelopmentCollateral private constant vm =
        VmYeltraDevelopmentCollateral(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant RECIPIENT = address(0xBEEF);
    address private constant SPENDER = address(0xCAFE);

    YeltraAccessManager private accessManager;
    YeltraTestnetDevelopmentCollateral private token;

    function setUp() public {
        vm.chainId(46630);
        accessManager = new YeltraAccessManager(address(this));
        token = new YeltraTestnetDevelopmentCollateral(address(accessManager));
    }

    function testMetadataAndAdminMint() public {
        assert(keccak256(bytes(token.name())) == keccak256(bytes("YELTRA Testnet Development Collateral")));
        assert(keccak256(bytes(token.symbol())) == keccak256(bytes("yDEVUSD")));
        assert(token.decimals() == 6);
        assert(token.DEVELOPMENT_ONLY());

        token.mint(RECIPIENT, 1_000_000);
        assert(token.totalSupply() == 1_000_000);
        assert(token.balanceOf(RECIPIENT) == 1_000_000);
    }

    function testStandardAllowanceAndTransferFrom() public {
        token.mint(address(this), 1_000_000);
        token.approve(SPENDER, 500_000);

        vm.startPrank(SPENDER);
        token.transferFrom(address(this), RECIPIENT, 125_000);
        vm.stopPrank();

        assert(token.balanceOf(address(this)) == 875_000);
        assert(token.balanceOf(RECIPIENT) == 125_000);
        assert(token.allowance(address(this), SPENDER) == 375_000);
    }

    function testMintRequiresAccessManagerAdminRole() public {
        vm.startPrank(RECIPIENT);
        vm.expectRevert();
        token.mint(RECIPIENT, 1);
        vm.stopPrank();
    }
}
