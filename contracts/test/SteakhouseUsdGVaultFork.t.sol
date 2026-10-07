// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraYieldSourceAdapter} from "../src/YeltraYieldSourceAdapter.sol";
import {YeltraAccessManager} from "../src/YeltraAccessManager.sol";
import {YeltraMarketFactory} from "../src/YeltraMarketFactory.sol";
import {YeltraNativeMarketRegistry} from "../src/YeltraNativeMarketRegistry.sol";
import {YeltraPrincipalToken} from "../src/YeltraPrincipalToken.sol";
import {YeltraRouter} from "../src/YeltraRouter.sol";
import {YeltraYieldToken} from "../src/YeltraYieldToken.sol";

interface VmSteakhouseFork {
    function createSelectFork(string calldata rpcUrl) external returns (uint256 forkId);
    function warp(uint256 timestamp) external;
    function startPrank(address sender) external;
    function stopPrank() external;
    function expectRevert() external;
}

interface IERC20Steakhouse {
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IERC4626Steakhouse is IERC20Steakhouse {
    function asset() external view returns (address);
    function decimals() external view returns (uint8);
    function totalAssets() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function previewDeposit(uint256 assets) external view returns (uint256);
    function previewMint(uint256 shares) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    function maxDeposit(address receiver) external view returns (uint256);
    function maxMint(address receiver) external view returns (uint256);
    function maxWithdraw(address owner) external view returns (uint256);
    function maxRedeem(address owner) external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function mint(uint256 shares, address receiver) external returns (uint256 assets);
}

contract SteakhouseUsdGVaultForkTest {
    VmSteakhouseFork private constant vm = VmSteakhouseFork(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant VAULT = 0xBeEff033F34C046626B8D0A041844C5d1A5409dd;
    address private constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address private constant HOLDER = 0x04822Ea321A0DEE6F40656172F29312104855d66;
    string private constant MAINNET_RPC = "https://rpc.mainnet.chain.robinhood.com";

    IERC4626Steakhouse private vault = IERC4626Steakhouse(VAULT);
    IERC20Steakhouse private usdg = IERC20Steakhouse(USDG);

    function setUp() public {
        vm.createSelectFork(MAINNET_RPC);
    }

    function testVaultIsErc4626BackedByUsdg() public view {
        assert(vault.asset() == USDG);
        assert(vault.decimals() == 18);
        assert(vault.totalAssets() > 0);
        assert(vault.totalSupply() > 0);
        assert(vault.convertToShares(1_000_000) > 0);
        assert(vault.convertToAssets(1e18) > 0);
        assert(vault.previewDeposit(1_000_000) > 0);
        assert(vault.previewMint(1e18) > 0);
        assert(vault.previewWithdraw(1_000_000) > 0);
        assert(vault.previewRedeem(1e18) > 0);
    }

    function testVaultCurrentlyBlocksDepositsAndRedemptions() public view {
        assert(vault.maxDeposit(address(this)) == 0);
        assert(vault.maxMint(address(this)) == 0);
        assert(vault.maxWithdraw(HOLDER) == 0);
        assert(vault.maxRedeem(HOLDER) == 0);
    }

    function testForkDepositAndRedeemReconcile() public {
        uint256 depositAssets = 1_000_000;
        uint256 assetsBefore = usdg.balanceOf(HOLDER);
        uint256 sharesBefore = vault.balanceOf(HOLDER);

        vm.startPrank(HOLDER);
        usdg.approve(VAULT, depositAssets);
        uint256 mintedShares = vault.deposit(depositAssets, HOLDER);
        assert(mintedShares > 0);
        assert(vault.balanceOf(HOLDER) > sharesBefore);

        uint256 redeemedAssets = vault.redeem(mintedShares, HOLDER, HOLDER);
        vm.stopPrank();

        assert(redeemedAssets > 0);
        assert(vault.balanceOf(HOLDER) == sharesBefore);
        assert(usdg.balanceOf(HOLDER) >= assetsBefore - 1);
    }

    function testForkYeltraAdapterDepositAndWithdrawReconcile() public {
        uint256 depositAssets = 1_000_000;
        YeltraYieldSourceAdapter adapter = new YeltraYieldSourceAdapter(VAULT, HOLDER, USDG);
        uint256 assetsBefore = usdg.balanceOf(HOLDER);
        uint256 adapterSharesBefore = adapter.sharesHeld();

        vm.startPrank(HOLDER);
        usdg.approve(address(adapter), depositAssets);
        uint256 mintedShares = adapter.depositAssets(depositAssets);
        assert(mintedShares > 0);
        assert(adapter.sharesHeld() > adapterSharesBefore);
        uint256 withdrawnAssets = adapter.withdrawAssets(depositAssets, HOLDER);
        vm.stopPrank();

        assert(withdrawnAssets >= depositAssets - 1);
        assert(adapter.sharesHeld() == adapterSharesBefore);
        assert(usdg.balanceOf(HOLDER) >= assetsBefore - 1);
    }

    function testForkSameHolderCanDepositWhenMorphoMaxFunctionsReturnZero() public {
        uint256 depositAssets = 1_000_000;
        uint256 assetsBefore = usdg.balanceOf(HOLDER);

        assert(vault.maxDeposit(HOLDER) == 0);
        assert(vault.maxMint(HOLDER) == 0);
        assert(vault.maxWithdraw(HOLDER) == 0);
        assert(vault.maxRedeem(HOLDER) == 0);

        vm.startPrank(HOLDER);
        usdg.approve(VAULT, depositAssets);
        uint256 mintedShares = vault.deposit(depositAssets, HOLDER);
        vm.stopPrank();

        assert(mintedShares > 0);
        assert(usdg.balanceOf(HOLDER) == assetsBefore - depositAssets);
        assert(vault.maxDeposit(HOLDER) == 0);
        assert(vault.maxMint(HOLDER) == 0);
    }

    function testForkSameHolderCanMintWhenMorphoMaxMintReturnsZero() public {
        uint256 requestedShares = 1e18;
        uint256 assetsBefore = usdg.balanceOf(HOLDER);

        assert(vault.maxMint(HOLDER) == 0);
        uint256 previewedAssets = vault.previewMint(requestedShares);
        assert(previewedAssets > 0);

        vm.startPrank(HOLDER);
        usdg.approve(VAULT, previewedAssets);
        uint256 paidAssets = vault.mint(requestedShares, HOLDER);
        vm.stopPrank();

        assert(paidAssets >= previewedAssets);
        assert(usdg.balanceOf(HOLDER) == assetsBefore - paidAssets);
        assert(vault.maxMint(HOLDER) == 0);
    }

    function testForkNativeMarketIssuesAndMaturesAgainstSteakhouseVault() public {
        YeltraAccessManager accessManager = new YeltraAccessManager(address(this));
        YeltraNativeMarketRegistry registry = new YeltraNativeMarketRegistry(address(accessManager));
        YeltraRouter router = new YeltraRouter(address(registry));
        YeltraMarketFactory factory =
            new YeltraMarketFactory(address(accessManager), address(registry), address(router));
        registry.setFactory(address(factory));
        factory.approveSource(VAULT, true);

        uint256 maturity = block.timestamp + 3_600;
        (address market, address pt, address yt,) = factory.createMarket(
            YeltraMarketFactory.MarketRequest({
                marketId: keccak256("USDG-STEAKHOUSE-FORK-CANARY"),
                sourceVault: VAULT,
                maturity: maturity,
                ptName: "Yeltra Principal USDG",
                ptSymbol: "yPT-USDG",
                ytName: "Yeltra Yield USDG",
                ytSymbol: "yYT-USDG"
            })
        );

        uint256 depositAssets = 1_000_000;
        uint256 holderBefore = usdg.balanceOf(HOLDER);
        vm.startPrank(HOLDER);
        usdg.approve(address(router), depositAssets);
        (uint256 ptAmount, uint256 ytAmount) =
            router.openPosition(market, depositAssets, HOLDER, depositAssets - 1, depositAssets - 1, type(uint256).max);
        assert(ptAmount >= depositAssets - 1 && ptAmount <= depositAssets);
        assert(ytAmount == ptAmount);
        assert(YeltraPrincipalToken(pt).balanceOf(HOLDER) == ptAmount);
        assert(YeltraYieldToken(yt).balanceOf(HOLDER) == ytAmount);

        vm.warp(maturity);
        YeltraPrincipalToken(pt).approve(address(router), ptAmount);
        uint256 redeemedAssets = router.redeemPrincipal(market, ptAmount, HOLDER, ptAmount - 1, type(uint256).max);
        vm.stopPrank();

        assert(redeemedAssets >= ptAmount - 1);
        assert(YeltraPrincipalToken(pt).balanceOf(HOLDER) == 0);
        assert(usdg.balanceOf(HOLDER) >= holderBefore - 1);
    }
}
