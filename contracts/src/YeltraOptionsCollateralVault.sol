// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraTokenUtils} from "./YeltraTokenUtils.sol";

interface IYeltraOptionsVaultAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title YeltraOptionsCollateralVault
/// @notice Holds Testnet option collateral and keeps locked/reserved balances
///         separate from withdrawable capacity.
contract YeltraOptionsCollateralVault {
    using YeltraTokenUtils for address;

    bytes32 public constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");

    error InsufficientAvailable(uint256 requested, uint256 available);
    error InvalidAddress();
    error InvalidAmount();
    error MarketAlreadySet();
    error Unauthorized(address caller);

    IYeltraOptionsVaultAccess public immutable accessManager;
    address public immutable collateralToken;
    address public market;
    uint256 public lockedCollateral;
    uint256 public reservedPayout;

    event MarketSet(address indexed market);
    event CollateralDeposited(address indexed provider, uint256 amount);
    event CollateralWithdrawn(address indexed recipient, uint256 amount);

    constructor(address accessManagerAddress, address collateralTokenAddress) {
        if (accessManagerAddress == address(0) || collateralTokenAddress == address(0)) {
            revert InvalidAddress();
        }
        accessManager = IYeltraOptionsVaultAccess(accessManagerAddress);
        collateralToken = collateralTokenAddress;
    }

    function setMarket(address marketAddress) external onlyAdmin {
        if (marketAddress == address(0)) revert InvalidAddress();
        if (market != address(0)) revert MarketAlreadySet();
        market = marketAddress;
        emit MarketSet(marketAddress);
    }

    function deposit(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        emit CollateralDeposited(msg.sender, amount);
    }

    function withdraw(address recipient, uint256 amount) external onlyAdmin {
        if (recipient == address(0) || amount == 0) revert InvalidAmount();
        _requireAvailable(amount);
        collateralToken.safeTransfer(recipient, amount);
        emit CollateralWithdrawn(recipient, amount);
    }

    function totalBalance() public view returns (uint256) {
        return collateralToken.balanceOf(address(this));
    }

    function availableCollateral() public view returns (uint256) {
        uint256 balance = totalBalance();
        uint256 reserved = lockedCollateral + reservedPayout;
        return balance > reserved ? balance - reserved : 0;
    }

    function lock(uint256 amount) external onlyMarket {
        _requireAvailable(amount);
        lockedCollateral += amount;
    }

    function settle(uint256 collateral, uint256 payout) external onlyMarket {
        if (collateral == 0 || payout > collateral) revert InvalidAmount();
        if (lockedCollateral < collateral) revert InsufficientAvailable(collateral, lockedCollateral);
        lockedCollateral -= collateral;
        reservedPayout += payout;
    }

    function claim(address recipient, uint256 amount) external onlyMarket {
        if (recipient == address(0)) revert InvalidAddress();
        if (reservedPayout < amount) revert InsufficientAvailable(amount, reservedPayout);
        reservedPayout -= amount;
        if (amount > 0) collateralToken.safeTransfer(recipient, amount);
    }

    modifier onlyAdmin() {
        if (!accessManager.hasRole(ADMIN_ROLE, msg.sender)) revert Unauthorized(msg.sender);
        _;
    }

    modifier onlyMarket() {
        if (msg.sender != market || market == address(0)) revert Unauthorized(msg.sender);
        _;
    }

    function _requireAvailable(uint256 amount) internal view {
        uint256 available = availableCollateral();
        if (amount > available) revert InsufficientAvailable(amount, available);
    }
}
