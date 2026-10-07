// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraTokenUtils} from "./YeltraTokenUtils.sol";

interface IYeltraERC4626 {
    function asset() external view returns (address);
    function decimals() external view returns (uint8);
    function balanceOf(address account) external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function previewDeposit(uint256 assets) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
}

contract YeltraYieldSourceAdapter {
    using YeltraTokenUtils for address;

    error InvalidAddress();
    error InvalidSourceAsset(address expected, address actual);
    error Unauthorized(address caller);
    error ZeroAmount();
    error ZeroShares();

    IYeltraERC4626 public immutable vault;
    address public immutable asset;
    address public immutable market;
    uint8 public immutable assetDecimals;
    uint8 public immutable shareDecimals;

    event SourceDeposit(uint256 assets, uint256 shares);
    event SourceWithdrawal(uint256 assets, uint256 shares, address indexed receiver);

    constructor(address vaultAddress, address marketAddress, address expectedAsset) {
        if (vaultAddress == address(0) || marketAddress == address(0) || expectedAsset == address(0)) {
            revert InvalidAddress();
        }
        address actualAsset = IYeltraERC4626(vaultAddress).asset();
        if (actualAsset != expectedAsset) revert InvalidSourceAsset(expectedAsset, actualAsset);
        vault = IYeltraERC4626(vaultAddress);
        asset = actualAsset;
        market = marketAddress;
        assetDecimals = expectedAsset.decimals();
        shareDecimals = IYeltraERC4626(vaultAddress).decimals();
    }

    function depositAssets(uint256 assets) external returns (uint256 shares) {
        _onlyMarket();
        if (assets == 0) revert ZeroAmount();
        asset.safeTransferFrom(market, address(this), assets);
        asset.safeApprove(address(vault), 0);
        asset.safeApprove(address(vault), assets);
        shares = vault.deposit(assets, address(this));
        if (shares == 0) revert ZeroShares();
        emit SourceDeposit(assets, shares);
    }

    function withdrawAssets(uint256 assets, address receiver) external returns (uint256 withdrawnAssets) {
        _onlyMarket();
        if (assets == 0 || receiver == address(0)) revert InvalidAddress();
        uint256 shares = vault.previewWithdraw(assets);
        uint256 heldShares = sharesHeld();
        if (shares > heldShares) shares = heldShares;
        if (shares == 0) revert ZeroShares();
        withdrawnAssets = vault.redeem(shares, receiver, address(this));
        if (withdrawnAssets == 0) revert ZeroAmount();
        emit SourceWithdrawal(assets, shares, receiver);
    }

    function sharesHeld() public view returns (uint256) {
        return vault.balanceOf(address(this));
    }

    function totalAssets() public view returns (uint256) {
        return vault.convertToAssets(sharesHeld());
    }

    function previewDeposit(uint256 assets) external view returns (uint256) {
        return vault.previewDeposit(assets);
    }

    function previewWithdraw(uint256 assets) external view returns (uint256) {
        return vault.previewWithdraw(assets);
    }

    function previewRedeem(uint256 shares) external view returns (uint256) {
        return vault.previewRedeem(shares);
    }

    /// @notice Previews the exact bounded redemption path used by the market.
    /// @dev Morpho Vault V2 can round the shares required for an asset amount.
    ///      Returning the subsequent previewRedeem result keeps UI slippage
    ///      previews honest when the source has dust or a realized loss.
    function previewWithdrawal(uint256 requestedAssets) external view returns (uint256 expectedAssets, uint256 shares) {
        if (requestedAssets == 0) return (0, 0);
        if (totalAssets() < requestedAssets) return (0, 0);

        shares = vault.previewWithdraw(requestedAssets);
        uint256 heldShares = sharesHeld();
        if (shares > heldShares) shares = heldShares;
        if (shares == 0) return (0, 0);

        expectedAssets = vault.previewRedeem(shares);
    }

    modifier onlyMarket() {
        _onlyMarket();
        _;
    }

    function _onlyMarket() internal view {
        if (msg.sender != market) revert Unauthorized(msg.sender);
    }
}
