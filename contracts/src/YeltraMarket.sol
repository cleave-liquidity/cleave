// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraPrincipalToken} from "./YeltraPrincipalToken.sol";
import {YeltraTokenUtils} from "./YeltraTokenUtils.sol";
import {YeltraYieldSourceAdapter} from "./YeltraYieldSourceAdapter.sol";
import {YeltraYieldToken} from "./YeltraYieldToken.sol";

interface IYeltraMarketAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

contract YeltraMarket {
    using YeltraTokenUtils for address;

    uint256 public constant INDEX_SCALE = 1e18;
    bytes32 public constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");

    error Expired();
    error InsufficientBacking(uint256 requested, uint256 available);
    error InvalidAddress();
    error InvalidAmount();
    error InvalidMaturity();
    error MarketIsPaused();
    error NotAuthorized(address caller);
    error SourceAdapterAlreadyConfigured();
    error SourceAssetMismatch();
    error Reentrancy();

    IYeltraMarketAccess public immutable accessManager;
    address public immutable factory;
    address public immutable router;
    address public immutable underlying;
    uint8 public immutable underlyingDecimals;
    uint256 public immutable maturity;
    YeltraPrincipalToken public immutable pt;
    YeltraYieldToken public immutable yt;
    YeltraYieldSourceAdapter public sourceAdapter;

    bool public paused;
    uint256 public yieldIndex;
    uint256 public lastYieldAssets;
    mapping(address => uint256) public userYieldIndex;
    mapping(address => uint256) public unclaimedYield;
    uint256 private locked;

    event AdapterConfigured(address indexed adapter);
    event MarketPaused(bool paused);
    event PositionIssued(address indexed payer, address indexed recipient, uint256 assets, uint256 shares);
    event PrincipalRedeemed(address indexed owner, address indexed recipient, uint256 ptAmount, uint256 assets);
    event YieldClaimed(address indexed owner, address indexed recipient, uint256 assets);

    constructor(
        address accessManagerAddress,
        address routerAddress,
        address underlyingAddress,
        uint256 maturityTimestamp,
        address ptAddress,
        address ytAddress
    ) {
        if (
            accessManagerAddress == address(0) || routerAddress == address(0) || underlyingAddress == address(0)
                || ptAddress == address(0) || ytAddress == address(0)
        ) revert InvalidAddress();
        if (maturityTimestamp <= block.timestamp) revert InvalidMaturity();
        accessManager = IYeltraMarketAccess(accessManagerAddress);
        factory = msg.sender;
        router = routerAddress;
        underlying = underlyingAddress;
        underlyingDecimals = YeltraTokenUtils.decimals(underlyingAddress);
        maturity = maturityTimestamp;
        pt = YeltraPrincipalToken(ptAddress);
        yt = YeltraYieldToken(ytAddress);
    }

    function configureSourceAdapter(address adapterAddress) external {
        if (msg.sender != factory) revert NotAuthorized(msg.sender);
        if (address(sourceAdapter) != address(0)) revert SourceAdapterAlreadyConfigured();
        if (adapterAddress == address(0) || YeltraYieldSourceAdapter(adapterAddress).asset() != underlying) {
            revert SourceAssetMismatch();
        }
        sourceAdapter = YeltraYieldSourceAdapter(adapterAddress);
        emit AdapterConfigured(adapterAddress);
    }

    function setPaused(bool nextPaused) external onlyAdminOrOperator {
        paused = nextPaused;
        emit MarketPaused(nextPaused);
    }

    function issueFor(address recipient, uint256 assets)
        external
        onlyRouter
        nonReentrant
        returns (uint256 ptAmount, uint256 ytAmount, uint256 shares)
    {
        if (recipient == address(0) || assets == 0) revert InvalidAmount();
        if (paused) revert MarketIsPaused();
        if (block.timestamp >= maturity) revert Expired();
        if (address(sourceAdapter) == address(0)) revert SourceAssetMismatch();
        if (underlying.balanceOf(address(this)) < assets) {
            revert InsufficientBacking(assets, underlying.balanceOf(address(this)));
        }

        _accrueYield();
        _settleUser(recipient);
        underlying.safeApprove(address(sourceAdapter), 0);
        underlying.safeApprove(address(sourceAdapter), assets);
        shares = sourceAdapter.depositAssets(assets);
        underlying.safeApprove(address(sourceAdapter), 0);
        ptAmount = sourceAdapter.previewRedeem(shares);
        if (ptAmount == 0) revert InsufficientBacking(assets, 0);
        ytAmount = ptAmount;
        pt.mint(recipient, ptAmount);
        yt.mint(recipient, ytAmount);
        emit PositionIssued(msg.sender, recipient, assets, shares);
    }

    function redeemPrincipalFor(address owner, address recipient, uint256 ptAmount)
        external
        onlyRouter
        nonReentrant
        returns (uint256 assets)
    {
        if (owner == address(0) || recipient == address(0) || ptAmount == 0) revert InvalidAmount();
        if (block.timestamp < maturity) revert Expired();
        _accrueYield();
        uint256 available = sourceAdapter.totalAssets();
        uint256 principal = pt.totalSupply();
        if (principal == 0 || ptAmount > principal) revert InsufficientBacking(ptAmount, principal);
        uint256 principalBacking = available < principal ? available : principal;
        assets = YeltraTokenUtils.mulDivDown(ptAmount, principalBacking, principal);
        if (assets == 0) revert InsufficientBacking(ptAmount, available);
        assets = sourceAdapter.withdrawAssets(assets, recipient);
        if (assets == 0) revert InsufficientBacking(ptAmount, assets);
        pt.burn(address(this), ptAmount);
        emit PrincipalRedeemed(owner, recipient, ptAmount, assets);
    }

    function claimYieldFor(address owner, address recipient) external onlyRouter nonReentrant returns (uint256 assets) {
        if (owner == address(0) || recipient == address(0)) revert InvalidAddress();
        _accrueYield();
        _settleUser(owner);
        assets = unclaimedYield[owner];
        if (assets == 0) return 0;
        uint256 available = sourceAdapter.totalAssets();
        uint256 principal = pt.totalSupply();
        if (available < principal || available - principal < assets) {
            revert InsufficientBacking(assets, available > principal ? available - principal : 0);
        }
        unclaimedYield[owner] = 0;
        uint256 withdrawn = sourceAdapter.withdrawAssets(assets, recipient);
        if (withdrawn < assets) revert InsufficientBacking(assets, withdrawn);
        emit YieldClaimed(owner, recipient, assets);
    }

    function previewIssue(uint256 assets) external view returns (uint256 ptAmount, uint256 ytAmount, uint256 shares) {
        if (address(sourceAdapter) == address(0)) return (0, 0, 0);
        shares = sourceAdapter.previewDeposit(assets);
        ptAmount = sourceAdapter.previewRedeem(shares);
        ytAmount = ptAmount;
    }

    function previewRedemption(uint256 ptAmount) external view returns (uint256 assets, bool available) {
        if (address(sourceAdapter) == address(0) || block.timestamp < maturity || ptAmount == 0) {
            return (0, false);
        }

        uint256 principal = pt.totalSupply();
        if (principal == 0 || ptAmount > principal) return (0, false);
        uint256 backing = sourceAdapter.totalAssets();
        uint256 principalBacking = backing < principal ? backing : principal;
        uint256 principalAssets = YeltraTokenUtils.mulDivDown(ptAmount, principalBacking, principal);
        (assets,) = sourceAdapter.previewWithdrawal(principalAssets);
        available = assets > 0;
    }

    function previewClaim(address owner) external view returns (uint256 assets) {
        uint256 index = _previewYieldIndex();
        uint256 balance = yt.balanceOf(owner);
        uint256 previous = userYieldIndex[owner];
        if (index > previous) assets = unclaimedYield[owner] + (balance * (index - previous)) / INDEX_SCALE;
        else assets = unclaimedYield[owner];
    }

    function currentSourceAssets() external view returns (uint256) {
        return _currentSourceAssets();
    }

    function currentYieldAssets() external view returns (uint256) {
        uint256 sourceAssets = _currentSourceAssets();
        uint256 principal = pt.totalSupply();
        return sourceAssets > principal ? sourceAssets - principal : 0;
    }

    function _accrueYield() internal {
        uint256 currentYield = _currentYieldAssets();
        uint256 supply = yt.totalSupply();
        if (supply > 0 && currentYield > lastYieldAssets) {
            yieldIndex += ((currentYield - lastYieldAssets) * INDEX_SCALE) / supply;
        }
        lastYieldAssets = currentYield;
    }

    function _previewYieldIndex() internal view returns (uint256 index) {
        index = yieldIndex;
        uint256 currentYield = _currentYieldAssets();
        uint256 supply = yt.totalSupply();
        if (supply > 0 && currentYield > lastYieldAssets) {
            index += ((currentYield - lastYieldAssets) * INDEX_SCALE) / supply;
        }
    }

    function _settleUser(address owner) internal {
        uint256 previous = userYieldIndex[owner];
        uint256 current = yieldIndex;
        uint256 balance = yt.balanceOf(owner);
        if (current > previous && balance > 0) {
            unclaimedYield[owner] += (balance * (current - previous)) / INDEX_SCALE;
        }
        userYieldIndex[owner] = current;
    }

    function _currentSourceAssets() internal view returns (uint256) {
        return address(sourceAdapter) == address(0) ? 0 : sourceAdapter.totalAssets();
    }

    function _currentYieldAssets() internal view returns (uint256) {
        uint256 sourceAssets = _currentSourceAssets();
        uint256 principal = pt.totalSupply();
        return sourceAssets > principal ? sourceAssets - principal : 0;
    }

    modifier onlyRouter() {
        if (msg.sender != router) revert NotAuthorized(msg.sender);
        _;
    }

    modifier onlyAdminOrOperator() {
        if (!accessManager.hasRole(ADMIN_ROLE, msg.sender) && !accessManager.hasRole(OPERATOR_ROLE, msg.sender)) {
            revert NotAuthorized(msg.sender);
        }
        _;
    }

    modifier nonReentrant() {
        if (locked != 0) revert Reentrancy();
        locked = 1;
        _;
        locked = 0;
    }
}
