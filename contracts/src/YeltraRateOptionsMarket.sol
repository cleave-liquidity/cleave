// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraOptionsCollateralVault} from "./YeltraOptionsCollateralVault.sol";
import {YeltraRateIndex} from "./YeltraRateIndex.sol";
import {YeltraTokenUtils} from "./YeltraTokenUtils.sol";

/// @title YeltraRateOptionsMarket
/// @notice Fully collateralized European CALL/PUT options on a yield rate.
/// @dev The quote model and operator-published index are explicitly a
///      Testnet development MVP. This contract is not a Mainnet oracle or
///      production pricing system.
contract YeltraRateOptionsMarket {
    using YeltraTokenUtils for address;

    uint256 public constant RATE_SCALE = 1e18;
    uint256 public constant BPS = 10_000;
    uint256 public constant BASE_PREMIUM_BPS = 100;
    uint256 public constant DISTANCE_PREMIUM_BPS = 2_500;
    uint256 public constant MAX_OPTION_DURATION = 365 days;

    enum OptionKind {
        CALL,
        PUT
    }

    enum OptionState {
        OPEN,
        SETTLED,
        CLAIMED
    }

    struct OptionPosition {
        address owner;
        OptionKind kind;
        OptionState state;
        uint256 strike;
        uint256 expiry;
        uint256 notional;
        uint256 premium;
        uint256 settlementRate;
        uint256 payout;
        uint256 openedAt;
    }

    error DeadlineExpired();
    error InvalidAmount();
    error InvalidCollateralToken();
    error InvalidExpiry();
    error InvalidOption(uint256 optionId);
    error InvalidStrike(uint256 strike);
    error NotExpired(uint256 expiry);
    error NotOwner(address caller);
    error OracleRateStale();
    error SettlementSnapshotMissing(uint256 expiry, uint256 observedAt);
    error PremiumTooHigh(uint256 premium, uint256 maximum);
    error Reentrancy();

    YeltraRateIndex public immutable rateIndex;
    YeltraOptionsCollateralVault public immutable collateralVault;
    address public immutable collateralToken;
    uint256 public nextOptionId = 1;
    uint256 private entered;

    mapping(uint256 => OptionPosition) public options;

    event OptionOpened(
        uint256 indexed optionId,
        address indexed owner,
        OptionKind indexed kind,
        uint256 strike,
        uint256 expiry,
        uint256 notional,
        uint256 premium
    );
    event OptionSettled(uint256 indexed optionId, uint256 settlementRate, uint256 payout);
    event OptionClaimed(uint256 indexed optionId, address indexed owner, uint256 payout);

    constructor(address rateIndexAddress, address collateralVaultAddress, address collateralTokenAddress) {
        if (
            rateIndexAddress == address(0)
                || collateralVaultAddress == address(0)
                || collateralTokenAddress == address(0)
        ) revert InvalidAmount();
        if (YeltraOptionsCollateralVault(collateralVaultAddress).collateralToken() != collateralTokenAddress) {
            revert InvalidCollateralToken();
        }
        rateIndex = YeltraRateIndex(rateIndexAddress);
        collateralVault = YeltraOptionsCollateralVault(collateralVaultAddress);
        collateralToken = collateralTokenAddress;
    }

    function quote(OptionKind kind, uint256 strike, uint256 expiry, uint256 notional)
        external
        view
        returns (uint256 premium, uint256 maxPayout, uint256 currentRate, uint64 observedAt, bool fresh)
    {
        kind;
        _validateTerms(strike, expiry, notional);
        currentRate = rateIndex.latestRate();
        observedAt = rateIndex.latestObservedAt();
        fresh = rateIndex.isFresh();
        if (!fresh) revert OracleRateStale();
        premium = _premium(currentRate, strike, notional);
        maxPayout = notional;
    }

    function openOption(
        OptionKind kind,
        uint256 strike,
        uint256 expiry,
        uint256 notional,
        uint256 maximumPremium,
        uint256 deadline
    ) external nonReentrant returns (uint256 optionId, uint256 premium) {
        if (block.timestamp > deadline || deadline == 0) revert DeadlineExpired();
        _validateTerms(strike, expiry, notional);
        (uint256 currentRate,, bool fresh) = _currentRate();
        if (!fresh) revert OracleRateStale();

        premium = _premium(currentRate, strike, notional);
        if (premium > maximumPremium) revert PremiumTooHigh(premium, maximumPremium);

        collateralToken.safeTransferFrom(msg.sender, address(collateralVault), premium);
        collateralVault.lock(notional);

        optionId = nextOptionId++;
        options[optionId] = OptionPosition({
            owner: msg.sender,
            kind: kind,
            state: OptionState.OPEN,
            strike: strike,
            expiry: expiry,
            notional: notional,
            premium: premium,
            settlementRate: 0,
            payout: 0,
            openedAt: block.timestamp
        });
        emit OptionOpened(optionId, msg.sender, kind, strike, expiry, notional, premium);
    }

    function settle(uint256 optionId) external nonReentrant returns (uint256 payout) {
        OptionPosition storage position = _openOption(optionId);
        if (block.timestamp <= position.expiry) revert NotExpired(position.expiry);

        (uint256 settlementRate, uint64 observedAt, bool fresh) = _currentRate();
        if (!fresh) revert OracleRateStale();
        if (observedAt < position.expiry) {
            revert SettlementSnapshotMissing(position.expiry, observedAt);
        }

        payout = _payoff(position.kind, settlementRate, position.strike, position.notional);
        position.state = OptionState.SETTLED;
        position.settlementRate = settlementRate;
        position.payout = payout;
        collateralVault.settle(position.notional, payout);
        emit OptionSettled(optionId, settlementRate, payout);
    }

    function claim(uint256 optionId) external nonReentrant returns (uint256 payout) {
        OptionPosition storage position = options[optionId];
        if (position.owner == address(0)) revert InvalidOption(optionId);
        if (position.owner != msg.sender) revert NotOwner(msg.sender);
        if (position.state != OptionState.SETTLED) revert InvalidOption(optionId);
        position.state = OptionState.CLAIMED;
        payout = position.payout;
        collateralVault.claim(msg.sender, payout);
        emit OptionClaimed(optionId, msg.sender, payout);
    }

    function previewPayoff(uint256 optionId, uint256 settlementRate) external view returns (uint256) {
        OptionPosition memory position = options[optionId];
        if (position.owner == address(0)) revert InvalidOption(optionId);
        return _payoff(position.kind, settlementRate, position.strike, position.notional);
    }

    function _currentRate() internal view returns (uint256 rate, uint64 observedAt, bool fresh) {
        rate = rateIndex.latestRate();
        observedAt = rateIndex.latestObservedAt();
        fresh = rateIndex.isFresh();
    }

    function _validateTerms(uint256 strike, uint256 expiry, uint256 notional) internal view {
        if (strike > RATE_SCALE) revert InvalidStrike(strike);
        if (notional == 0) revert InvalidAmount();
        if (expiry <= block.timestamp || expiry > block.timestamp + MAX_OPTION_DURATION) {
            revert InvalidExpiry();
        }
    }

    function _premium(uint256 currentRate, uint256 strike, uint256 notional) internal pure returns (uint256) {
        uint256 distance = currentRate > strike ? currentRate - strike : strike - currentRate;
        uint256 base = YeltraTokenUtils.mulDivDown(notional, BASE_PREMIUM_BPS, BPS);
        uint256 distanceAmount = YeltraTokenUtils.mulDivDown(notional, distance, RATE_SCALE);
        uint256 distancePremium = YeltraTokenUtils.mulDivDown(distanceAmount, DISTANCE_PREMIUM_BPS, BPS);
        uint256 premium = base + distancePremium;
        return premium == 0 ? 1 : premium;
    }

    function _payoff(OptionKind kind, uint256 settlementRate, uint256 strike, uint256 notional)
        internal
        pure
        returns (uint256)
    {
        uint256 difference;
        if (kind == OptionKind.CALL) {
            difference = settlementRate > strike ? settlementRate - strike : 0;
        } else {
            difference = strike > settlementRate ? strike - settlementRate : 0;
        }
        uint256 payout = YeltraTokenUtils.mulDivDown(notional, difference, RATE_SCALE);
        return payout > notional ? notional : payout;
    }

    function _openOption(uint256 optionId) internal view returns (OptionPosition storage position) {
        position = options[optionId];
        if (position.owner == address(0) || position.state != OptionState.OPEN) {
            revert InvalidOption(optionId);
        }
    }

    modifier nonReentrant() {
        if (entered != 0) revert Reentrancy();
        entered = 1;
        _;
        entered = 0;
    }
}
