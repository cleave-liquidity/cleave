// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraMarket} from "./YeltraMarket.sol";
import {YeltraNativeMarketRegistry} from "./YeltraNativeMarketRegistry.sol";
import {YeltraTokenUtils} from "./YeltraTokenUtils.sol";

interface IYeltraNativeToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract YeltraRouter {
    using YeltraTokenUtils for address;

    error DeadlineExpired();
    error InvalidAddress();
    error InvalidAmount();
    error MarketUnavailable();
    error SlippageExceeded(uint256 expected, uint256 actual);

    YeltraNativeMarketRegistry public immutable registry;

    constructor(address registryAddress) {
        if (registryAddress == address(0)) revert InvalidAddress();
        registry = YeltraNativeMarketRegistry(registryAddress);
    }

    function openPosition(
        address marketAddress,
        uint256 assets,
        address recipient,
        uint256 minPt,
        uint256 minYt,
        uint256 deadline
    ) external returns (uint256 ptAmount, uint256 ytAmount) {
        _checkDeadline(deadline);
        if (recipient == address(0) || assets == 0) revert InvalidAmount();
        YeltraNativeMarketRegistry.MarketConfig memory config = _activeMarket(marketAddress);
        config.underlying.safeTransferFrom(msg.sender, marketAddress, assets);
        (ptAmount, ytAmount,) = YeltraMarket(marketAddress).issueFor(recipient, assets);
        if (ptAmount < minPt) revert SlippageExceeded(minPt, ptAmount);
        if (ytAmount < minYt) revert SlippageExceeded(minYt, ytAmount);
    }

    function redeemPrincipal(
        address marketAddress,
        uint256 ptAmount,
        address recipient,
        uint256 minAssets,
        uint256 deadline
    ) external returns (uint256 assets) {
        _checkDeadline(deadline);
        if (recipient == address(0) || ptAmount == 0) revert InvalidAmount();
        YeltraNativeMarketRegistry.MarketConfig memory config = _registeredMarket(marketAddress);
        config.pt.safeTransferFrom(msg.sender, marketAddress, ptAmount);
        assets = YeltraMarket(marketAddress).redeemPrincipalFor(msg.sender, recipient, ptAmount);
        if (assets < minAssets) revert SlippageExceeded(minAssets, assets);
    }

    function claimYield(address marketAddress, address recipient, uint256 deadline) external returns (uint256 assets) {
        _checkDeadline(deadline);
        if (recipient == address(0)) revert InvalidAddress();
        _registeredMarket(marketAddress);
        assets = YeltraMarket(marketAddress).claimYieldFor(msg.sender, recipient);
    }

    function previewIssue(address marketAddress, uint256 assets)
        external
        view
        returns (uint256 ptAmount, uint256 ytAmount, uint256 shares)
    {
        _registeredMarket(marketAddress);
        return YeltraMarket(marketAddress).previewIssue(assets);
    }

    function previewRedemption(address marketAddress, uint256 ptAmount)
        external
        view
        returns (uint256 assets, bool available)
    {
        _registeredMarket(marketAddress);
        return YeltraMarket(marketAddress).previewRedemption(ptAmount);
    }

    function previewClaim(address marketAddress, address owner) external view returns (uint256 assets) {
        if (owner == address(0)) revert InvalidAddress();
        _registeredMarket(marketAddress);
        return YeltraMarket(marketAddress).previewClaim(owner);
    }

    function _activeMarket(address marketAddress)
        internal
        view
        returns (YeltraNativeMarketRegistry.MarketConfig memory config)
    {
        config = _registeredMarket(marketAddress);
        if (!config.enabled || config.paused || config.chainId != block.chainid || block.timestamp >= config.maturity) {
            revert MarketUnavailable();
        }
    }

    function _registeredMarket(address marketAddress)
        internal
        view
        returns (YeltraNativeMarketRegistry.MarketConfig memory config)
    {
        if (marketAddress == address(0)) revert InvalidAddress();
        bytes32 marketId = registry.marketIdForAddress(marketAddress);
        if (marketId == bytes32(0)) revert MarketUnavailable();
        config = registry.getMarket(marketId);
    }

    function _checkDeadline(uint256 deadline) internal view {
        if (deadline == 0 || block.timestamp > deadline) revert DeadlineExpired();
    }
}
