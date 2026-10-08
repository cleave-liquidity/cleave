// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal role interface used by the development rate index.
interface IYeltraRateIndexAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title YeltraRateIndex
/// @notice Operator-published yield-rate index for the isolated Testnet
///         Yield Rate Options MVP.
/// @dev This is intentionally not a production oracle. It has no external
///      feed and must not be used for Mainnet settlement.
contract YeltraRateIndex {
    bytes32 public constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    uint256 public constant RATE_SCALE = 1e18;

    error InvalidAddress();
    error InvalidRate(uint256 rate);
    error InvalidTimestamp(uint256 timestamp);
    error StaleRate();
    error Unauthorized(address caller);

    IYeltraRateIndexAccess public immutable accessManager;
    uint256 public immutable maxStaleness;
    string public sourceLabel;
    uint256 public latestRate;
    uint64 public latestObservedAt;

    event RatePublished(uint256 indexed rate, uint256 indexed observedAt, address indexed publisher);

    constructor(
        address accessManagerAddress,
        string memory sourceLabelValue,
        uint256 initialRate,
        uint64 initialObservedAt,
        uint256 maxStalenessSeconds
    ) {
        if (accessManagerAddress == address(0)) revert InvalidAddress();
        if (initialRate > RATE_SCALE) revert InvalidRate(initialRate);
        if (initialObservedAt == 0 || initialObservedAt > block.timestamp) {
            revert InvalidTimestamp(initialObservedAt);
        }
        if (maxStalenessSeconds == 0) revert StaleRate();

        accessManager = IYeltraRateIndexAccess(accessManagerAddress);
        sourceLabel = sourceLabelValue;
        latestRate = initialRate;
        latestObservedAt = initialObservedAt;
        maxStaleness = maxStalenessSeconds;
    }

    function publishRate(uint256 rate, uint64 observedAt) external onlyAdminOrOperator {
        if (rate > RATE_SCALE) revert InvalidRate(rate);
        if (observedAt == 0 || observedAt > block.timestamp || observedAt <= latestObservedAt) {
            revert InvalidTimestamp(observedAt);
        }
        latestRate = rate;
        latestObservedAt = observedAt;
        emit RatePublished(rate, observedAt, msg.sender);
    }

    function isFresh() public view returns (bool) {
        return latestObservedAt != 0 && block.timestamp <= uint256(latestObservedAt) + maxStaleness;
    }

    function readRate() external view returns (uint256 rate, uint64 observedAt, bool fresh) {
        rate = latestRate;
        observedAt = latestObservedAt;
        fresh = isFresh();
    }

    modifier onlyAdminOrOperator() {
        if (
            !accessManager.hasRole(ADMIN_ROLE, msg.sender)
                && !accessManager.hasRole(OPERATOR_ROLE, msg.sender)
        ) revert Unauthorized(msg.sender);
        _;
    }
}
