// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraDividendDemoYieldToken} from "../src/YeltraDividendDemoYieldToken.sol";

interface VmDividendDemoToken {
    function chainId(uint256 newChainId) external;
    function prank(address caller) external;
    function expectRevert(bytes calldata revertData) external;
    function expectRevert(bytes4 revertData) external;
}

contract MockDividendDemoAccess {
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    mapping(address => bool) public operators;

    function setOperator(address account, bool enabled) external {
        operators[account] = enabled;
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return role == OPERATOR_ROLE && operators[account];
    }
}

contract YeltraDividendDemoYieldTokenTest {
    VmDividendDemoToken private constant vm =
        VmDividendDemoToken(address(uint160(uint256(keccak256("hevm cheat code")))));

    function testOperatorMintsFixedSupplyOnlyToDesignatedWallet() external {
        vm.chainId(46630);
        MockDividendDemoAccess access = new MockDividendDemoAccess();
        address operator = address(0xA11CE);
        address demoWallet = address(0xBEEF);
        access.setOperator(operator, true);
        YeltraDividendDemoYieldToken token = new YeltraDividendDemoYieldToken(address(access), demoWallet);

        vm.prank(operator);
        token.mintDevelopmentPosition();

        require(token.totalSupply() == 2 ether, "supply");
        require(token.balanceOf(demoWallet) == 2 ether, "designated balance");
        require(token.balanceOf(operator) == 0, "operator balance");
        require(token.developmentOnly(), "development marker");
    }

    function testMintIsOneTimeAndNonOperatorCannotMint() external {
        vm.chainId(46630);
        MockDividendDemoAccess access = new MockDividendDemoAccess();
        address operator = address(0xA11CE);
        access.setOperator(operator, true);
        YeltraDividendDemoYieldToken token = new YeltraDividendDemoYieldToken(address(access), address(0xBEEF));

        vm.expectRevert(abi.encodeWithSelector(YeltraDividendDemoYieldToken.Unauthorized.selector, address(this)));
        token.mintDevelopmentPosition();

        vm.prank(operator);
        token.mintDevelopmentPosition();
        vm.expectRevert(YeltraDividendDemoYieldToken.AlreadyMinted.selector);
        vm.prank(operator);
        token.mintDevelopmentPosition();
    }

    function testExposureCannotBeTransferred() external {
        vm.chainId(46630);
        MockDividendDemoAccess access = new MockDividendDemoAccess();
        YeltraDividendDemoYieldToken token = new YeltraDividendDemoYieldToken(address(access), address(0xBEEF));
        vm.expectRevert(YeltraDividendDemoYieldToken.NonTransferable.selector);
        token.transfer(address(0xCAFE), 1);
    }

    function testCannotDeployOutsideTestnet() external {
        vm.chainId(4663);
        MockDividendDemoAccess access = new MockDividendDemoAccess();
        vm.expectRevert(abi.encodeWithSelector(YeltraDividendDemoYieldToken.WrongChain.selector, 4663));
        new YeltraDividendDemoYieldToken(address(access), address(0xBEEF));
    }
}
