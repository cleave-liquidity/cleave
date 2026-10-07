// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraAccessManager} from "../src/YeltraAccessManager.sol";
import {YeltraMarket} from "../src/YeltraMarket.sol";
import {YeltraMarketFactory} from "../src/YeltraMarketFactory.sol";
import {YeltraNativeMarketRegistry} from "../src/YeltraNativeMarketRegistry.sol";
import {YeltraPrincipalToken} from "../src/YeltraPrincipalToken.sol";
import {YeltraRouter} from "../src/YeltraRouter.sol";
import {YeltraYieldSourceAdapter} from "../src/YeltraYieldSourceAdapter.sol";
import {YeltraYieldToken} from "../src/YeltraYieldToken.sol";

interface VmYeltraNative {
    function warp(uint256 timestamp) external;
    function startPrank(address sender) external;
    function stopPrank() external;
    function expectRevert() external;
}

interface IERC20YeltraNative {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MockUsdG {
    string public constant name = "Mock USDG";
    string public constant symbol = "mUSDG";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "balance");
        uint256 permitted = allowance[from][msg.sender];
        require(permitted >= amount, "allowance");
        if (permitted != type(uint256).max) allowance[from][msg.sender] = permitted - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockUsdGVault {
    MockUsdG public immutable asset;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    constructor(address assetAddress) {
        asset = MockUsdG(assetAddress);
    }

    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply;
        uint256 backing = totalAssets();
        return supply == 0 || backing == 0 ? assets * 1e12 : assets * supply / backing;
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply;
        return supply == 0 ? shares / 1e12 : shares * totalAssets() / supply;
    }

    function previewDeposit(uint256 assets) external view returns (uint256) {
        return convertToShares(assets);
    }

    function previewWithdraw(uint256 assets) external view returns (uint256) {
        uint256 supply = totalSupply;
        uint256 backing = totalAssets();
        return (assets * supply + backing - 1) / backing;
    }

    function previewRedeem(uint256 shares) external view returns (uint256) {
        return convertToAssets(shares);
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        shares = convertToShares(assets);
        require(asset.transferFrom(msg.sender, address(this), assets), "deposit transfer");
        totalSupply += shares;
        balanceOf[receiver] += shares;
    }

    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares) {
        shares = this.previewWithdraw(assets);
        require(balanceOf[owner] >= shares, "shares");
        balanceOf[owner] -= shares;
        totalSupply -= shares;
        require(asset.transfer(receiver, assets), "withdraw transfer");
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        require(balanceOf[owner] >= shares, "shares");
        assets = convertToAssets(shares);
        balanceOf[owner] -= shares;
        totalSupply -= shares;
        require(asset.transfer(receiver, assets), "redeem transfer");
    }

    function accrue(uint256 assets) external {
        asset.mint(address(this), assets);
    }

    function lose(uint256 assets) external {
        require(asset.transfer(address(0), assets), "loss transfer");
    }
}

contract YeltraNativeMarketTest {
    VmYeltraNative private constant vm = VmYeltraNative(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant USER = address(0xBEEF);
    address private constant SECOND_USER = address(0xCAFE);

    MockUsdG private token;
    MockUsdGVault private vault;
    YeltraAccessManager private accessManager;
    YeltraNativeMarketRegistry private registry;
    YeltraRouter private router;
    YeltraMarketFactory private factory;
    address private market;
    address private pt;
    address private yt;
    uint256 private maturity;

    function setUp() public {
        token = new MockUsdG();
        vault = new MockUsdGVault(address(token));
        accessManager = new YeltraAccessManager(address(this));
        registry = new YeltraNativeMarketRegistry(address(accessManager));
        router = new YeltraRouter(address(registry));
        factory = new YeltraMarketFactory(address(accessManager), address(registry), address(router));
        registry.setFactory(address(factory));
        factory.approveSource(address(vault), true);

        maturity = block.timestamp + 100;
        (market, pt, yt,) = factory.createMarket(
            YeltraMarketFactory.MarketRequest({
                marketId: keccak256("USDG-STEAKHOUSE-CANARY"),
                sourceVault: address(vault),
                maturity: maturity,
                ptName: "Yeltra Principal USDG",
                ptSymbol: "yPT-USDG",
                ytName: "Yeltra Yield USDG",
                ytSymbol: "yYT-USDG"
            })
        );

        token.mint(USER, 2_000_000);
    }

    function testNativeCanaryIssuesPTAndYTAgainstVaultShares() public {
        uint256 principal = 1_000_000;
        uint256 deadline = type(uint256).max;

        vm.startPrank(USER);
        token.approve(address(router), principal);
        (uint256 ptAmount, uint256 ytAmount) =
            router.openPosition(market, principal, USER, principal, principal, deadline);
        vm.stopPrank();

        assert(ptAmount == principal);
        assert(ytAmount == principal);
        assert(YeltraPrincipalToken(pt).balanceOf(USER) == principal);
        assert(YeltraYieldToken(yt).balanceOf(USER) == principal);
        assert(vault.totalAssets() == principal);
        assert(
            YeltraYieldSourceAdapter(
                    YeltraNativeMarketRegistry(registry).getMarket(registry.marketIdForAddress(market)).sourceAdapter
                )
                .totalAssets() == principal
        );
    }

    function testNativeCanaryClaimsVaultYieldBeforeMaturity() public {
        _openPosition();
        vault.accrue(100_000);

        uint256 before = token.balanceOf(USER);
        vm.startPrank(USER);
        uint256 claimed = router.claimYield(market, USER, type(uint256).max);
        vm.stopPrank();

        assert(claimed == 100_000);
        assert(token.balanceOf(USER) == before + claimed);
        assert(YeltraYieldToken(yt).balanceOf(USER) == 1_000_000);
    }

    function testNativeCanaryRedeemsPrincipalAtMaturity() public {
        _openPosition();
        vm.warp(maturity);

        vm.startPrank(USER);
        YeltraPrincipalToken(pt).approve(address(router), 1_000_000);
        uint256 before = token.balanceOf(USER);
        uint256 redeemed = router.redeemPrincipal(market, 1_000_000, USER, 1_000_000, type(uint256).max);
        vm.stopPrank();

        assert(redeemed == 1_000_000);
        assert(token.balanceOf(USER) == before + redeemed);
        assert(YeltraPrincipalToken(pt).balanceOf(USER) == 0);
        assert(YeltraYieldToken(yt).balanceOf(USER) == 1_000_000);
    }

    function testNativeCanaryDoesNotOfferEarlySale() public {
        _openPosition();
        (bool success,) = market.call(abi.encodeWithSignature("sellEarly(uint256)", 1));
        assert(!success);
    }

    function testFuzzNativeIssuanceNeverExceedsSourceBacking(uint96 rawAmount) public {
        uint256 amount = (uint256(rawAmount) % 1_500_000) + 1;

        vm.startPrank(USER);
        token.approve(address(router), amount);
        (uint256 ptAmount, uint256 ytAmount) =
            router.openPosition(market, amount, USER, amount, amount, type(uint256).max);
        vm.stopPrank();

        YeltraYieldSourceAdapter adapter =
            YeltraYieldSourceAdapter(registry.getMarket(registry.marketIdForAddress(market)).sourceAdapter);
        assert(ptAmount == ytAmount);
        assert(YeltraPrincipalToken(pt).totalSupply() == ptAmount);
        assert(YeltraYieldToken(yt).totalSupply() == ytAmount);
        assert(ptAmount <= adapter.totalAssets());
        assert(ytAmount <= adapter.totalAssets());
    }

    function testNativeClaimsAreSingleUseAndYieldBacked() public {
        _openPosition();
        vault.accrue(100_000);

        vm.startPrank(USER);
        uint256 firstClaim = router.claimYield(market, USER, type(uint256).max);
        uint256 secondClaim = router.claimYield(market, USER, type(uint256).max);
        vm.stopPrank();

        assert(firstClaim == 100_000);
        assert(secondClaim == 0);
        assert(YeltraMarket(market).currentYieldAssets() == 0);
        assert(YeltraMarket(market).currentSourceAssets() >= YeltraPrincipalToken(pt).totalSupply());
    }

    function testNativeHandlesLargeYieldWithinSourceBounds() public {
        _openPosition();
        uint256 accrued = type(uint128).max;
        vault.accrue(accrued);

        vm.startPrank(USER);
        uint256 claimed = router.claimYield(market, USER, type(uint256).max);
        vm.stopPrank();

        assert(claimed == accrued);
        assert(YeltraMarket(market).currentYieldAssets() == 0);
    }

    function testNativeSupportsPartialRedemptionAndRejectsDoubleRedemption() public {
        _openPosition();
        vm.warp(maturity);

        vm.startPrank(USER);
        YeltraPrincipalToken(pt).approve(address(router), 1_000_000);
        uint256 first = router.redeemPrincipal(market, 400_000, USER, 400_000, type(uint256).max);
        uint256 second = router.redeemPrincipal(market, 600_000, USER, 600_000, type(uint256).max);
        vm.expectRevert();
        router.redeemPrincipal(market, 1, USER, 0, type(uint256).max);
        vm.stopPrank();

        assert(first == 400_000);
        assert(second == 600_000);
        assert(YeltraPrincipalToken(pt).balanceOf(USER) == 0);
    }

    function testNativeMaturityBoundaryAndPauseBlockIssuance() public {
        _openPosition();
        vm.startPrank(USER);
        YeltraPrincipalToken(pt).approve(address(router), 1);
        token.approve(address(router), 1_000_000);
        vm.expectRevert();
        router.redeemPrincipal(market, 1, USER, 0, type(uint256).max);
        vm.stopPrank();

        bytes32 marketId = registry.marketIdForAddress(market);
        registry.setMarketPaused(marketId, true);
        vm.startPrank(USER);
        vm.expectRevert();
        router.openPosition(market, 1_000_000, USER, 0, 0, type(uint256).max);
        vm.stopPrank();
    }

    function testNativeLossAllowsOnlyProRataPrincipalRedemption() public {
        _openPosition();
        vault.lose(100_000);
        vm.warp(maturity);

        (uint256 previewed, bool available) = YeltraMarket(market).previewRedemption(1_000_000);
        assert(available);
        assert(previewed == 900_000);

        vm.startPrank(USER);
        YeltraPrincipalToken(pt).approve(address(router), 1_000_000);
        uint256 redeemed = router.redeemPrincipal(market, 1_000_000, USER, 900_000, type(uint256).max);
        vm.stopPrank();

        assert(redeemed == 900_000);
        assert(YeltraPrincipalToken(pt).totalSupply() == 0);
        assert(YeltraYieldToken(yt).totalSupply() == 1_000_000);
    }

    function testNativePTCanTransferButYTCannot() public {
        _openPosition();

        vm.startPrank(USER);
        YeltraPrincipalToken(pt).transfer(SECOND_USER, 1_000_000);
        (bool ytTransferSuccess,) = yt.call(abi.encodeWithSignature("transfer(address,uint256)", SECOND_USER, 1));
        vm.stopPrank();

        assert(YeltraPrincipalToken(pt).balanceOf(SECOND_USER) == 1_000_000);
        assert(!ytTransferSuccess);
    }

    function testNativeRegistryRejectsDuplicateMarketId() public {
        MockUsdGVault secondVault = new MockUsdGVault(address(token));
        factory.approveSource(address(secondVault), true);

        vm.expectRevert();
        factory.createMarket(
            YeltraMarketFactory.MarketRequest({
                marketId: keccak256("USDG-STEAKHOUSE-CANARY"),
                sourceVault: address(secondVault),
                maturity: maturity + 1,
                ptName: "Duplicate PT",
                ptSymbol: "dPT",
                ytName: "Duplicate YT",
                ytSymbol: "dYT"
            })
        );
    }

    function _openPosition() private {
        vm.startPrank(USER);
        token.approve(address(router), 1_000_000);
        router.openPosition(market, 1_000_000, USER, 1_000_000, 1_000_000, type(uint256).max);
        vm.stopPrank();
    }
}
