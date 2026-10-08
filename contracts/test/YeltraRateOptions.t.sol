// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraAccessManager} from "../src/YeltraAccessManager.sol";
import {YeltraOptionsCollateralVault} from "../src/YeltraOptionsCollateralVault.sol";
import {YeltraRateIndex} from "../src/YeltraRateIndex.sol";
import {YeltraRateOptionsMarket} from "../src/YeltraRateOptionsMarket.sol";

interface VmYeltraRateOptions {
    function warp(uint256 timestamp) external;
    function startPrank(address sender) external;
    function stopPrank() external;
    function expectRevert() external;
}

contract MockOptionsCollateral {
    uint8 public constant decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address recipient, uint256 amount) external {
        balanceOf[recipient] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        require(balanceOf[sender] >= amount, "balance");
        uint256 permitted = allowance[sender][msg.sender];
        require(permitted >= amount, "allowance");
        if (permitted != type(uint256).max) allowance[sender][msg.sender] = permitted - amount;
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        return true;
    }
}

contract YeltraRateOptionsTest {
    VmYeltraRateOptions private constant vm =
        VmYeltraRateOptions(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant BUYER = address(0xBEEF);
    uint256 private constant INITIAL_RATE = 50_000_000_000_000_000; // 5% in 1e18 rate units.
    uint256 private constant INITIAL_OBSERVED_AT = 1_000;
    uint256 private constant MAX_STALENESS = 1_000;
    uint256 private constant NOTIONAL = 1_000_000;

    MockOptionsCollateral private token;
    YeltraRateIndex private index;
    YeltraOptionsCollateralVault private vault;
    YeltraRateOptionsMarket private market;
    uint256 private expiry;

    function setUp() public {
        vm.warp(INITIAL_OBSERVED_AT);
        token = new MockOptionsCollateral();
        YeltraAccessManager access = new YeltraAccessManager(address(this));
        index = new YeltraRateIndex(
            address(access), "TESTNET DEVELOPMENT RATE INDEX", INITIAL_RATE, uint64(INITIAL_OBSERVED_AT), MAX_STALENESS
        );
        vault = new YeltraOptionsCollateralVault(address(access), address(token));
        market = new YeltraRateOptionsMarket(address(index), address(vault), address(token));
        vault.setMarket(address(market));

        token.mint(address(this), NOTIONAL * 2);
        token.approve(address(vault), NOTIONAL * 2);
        vault.deposit(NOTIONAL * 2);
        token.mint(BUYER, NOTIONAL * 2);
        expiry = block.timestamp + 100;
    }

    function testCallIsFullyCollateralizedAndPaysAtClaim() public {
        uint256 strike = 40_000_000_000_000_000; // 4%.
        vm.startPrank(BUYER);
        token.approve(address(market), type(uint256).max);
        (uint256 optionId, uint256 premium) = market.openOption(
            YeltraRateOptionsMarket.OptionKind.CALL,
            strike,
            expiry,
            NOTIONAL,
            NOTIONAL,
            expiry
        );
        vm.stopPrank();

        assert(premium > 0);
        assert(vault.lockedCollateral() == NOTIONAL);
        (address owner,,,,,,,,,) = market.options(optionId);
        assert(owner == BUYER);

        vm.warp(expiry + 1);
        index.publishRate(80_000_000_000_000_000, uint64(block.timestamp)); // 8%.
        uint256 payout = market.settle(optionId);
        assert(payout == 40_000);

        uint256 before = token.balanceOf(BUYER);
        vm.startPrank(BUYER);
        uint256 claimed = market.claim(optionId);
        vm.stopPrank();
        assert(claimed == payout);
        assert(token.balanceOf(BUYER) == before + payout);
        assert(vault.lockedCollateral() == 0);
        assert(vault.reservedPayout() == 0);
    }

    function testPutPaysWhenRateFalls() public {
        uint256 strike = 60_000_000_000_000_000; // 6%.
        vm.startPrank(BUYER);
        token.approve(address(market), type(uint256).max);
        (uint256 optionId,) = market.openOption(
            YeltraRateOptionsMarket.OptionKind.PUT,
            strike,
            expiry,
            NOTIONAL,
            NOTIONAL,
            expiry
        );
        vm.stopPrank();

        vm.warp(expiry + 1);
        index.publishRate(20_000_000_000_000_000, uint64(block.timestamp)); // 2%.
        assert(market.settle(optionId) == 40_000);
    }

    function testCannotOpenWithoutVaultCapacity() public {
        YeltraOptionsCollateralVault emptyVault = new YeltraOptionsCollateralVault(address(index.accessManager()), address(token));
        YeltraRateOptionsMarket emptyMarket = new YeltraRateOptionsMarket(address(index), address(emptyVault), address(token));
        emptyVault.setMarket(address(emptyMarket));

        vm.startPrank(BUYER);
        token.approve(address(emptyMarket), type(uint256).max);
        vm.expectRevert();
        emptyMarket.openOption(
            YeltraRateOptionsMarket.OptionKind.CALL,
            INITIAL_RATE,
            expiry,
            NOTIONAL,
            NOTIONAL,
            expiry
        );
        vm.stopPrank();
    }

    function testRejectsStaleRateAndMissingSettlementSnapshot() public {
        vm.startPrank(BUYER);
        token.approve(address(market), type(uint256).max);
        (uint256 optionId,) = market.openOption(
            YeltraRateOptionsMarket.OptionKind.CALL,
            INITIAL_RATE,
            expiry,
            NOTIONAL,
            NOTIONAL,
            expiry
        );
        vm.stopPrank();

        vm.warp(expiry + MAX_STALENESS + 1);
        vm.expectRevert();
        market.settle(optionId);

        vm.warp(expiry + 1);
        vm.expectRevert();
        market.settle(optionId);
    }

    function testSettlementIsSingleUseAndClaimIsOwnerOnly() public {
        vm.startPrank(BUYER);
        token.approve(address(market), type(uint256).max);
        (uint256 optionId,) = market.openOption(
            YeltraRateOptionsMarket.OptionKind.CALL,
            INITIAL_RATE,
            expiry,
            NOTIONAL,
            NOTIONAL,
            expiry
        );
        vm.stopPrank();

        vm.warp(expiry + 1);
        index.publishRate(INITIAL_RATE, uint64(block.timestamp));
        market.settle(optionId);
        vm.expectRevert();
        market.settle(optionId);

        vm.expectRevert();
        market.claim(optionId);

        vm.startPrank(BUYER);
        market.claim(optionId);
        vm.stopPrank();
    }
}
