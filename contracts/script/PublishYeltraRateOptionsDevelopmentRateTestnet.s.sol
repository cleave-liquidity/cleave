// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraRateIndex} from "../src/YeltraRateIndex.sol";

interface VmYeltraOptionsRatePublish {
    function envAddress(string calldata name) external returns (address value);
    function envUint(string calldata name) external returns (uint256 value);
    function envString(string calldata name) external returns (string memory value);
    function startBroadcast(address account) external;
    function stopBroadcast() external;
}

interface IYeltraOptionsRatePublisherAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @notice Publishes an explicitly operator-supplied DEVELOPMENT rate to Testnet.
/// @dev Does not claim the value is an observed external yield rate or oracle data.
contract PublishYeltraRateOptionsDevelopmentRateTestnet {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    address private constant EXPOSED_HISTORICAL_ADMIN = 0x1e1AD136fb877aB473834E869407C7ae59fCFe8B;
    uint256 private constant RATE_SCALE = 1e18;
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 private constant CONFIRMATION_HASH =
        keccak256("YELTRA_RATE_OPTIONS_PUBLISH_TESTNET_46630");

    VmYeltraOptionsRatePublish private constant vm =
        VmYeltraOptionsRatePublish(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error InvalidConfiguration();
    error UnauthorizedPublisher(address publisher);
    error ExposedHistoricalAdminForbidden();
    error DevelopmentIndexRequired();
    error ObservationNotAdvanced(uint64 latestObservedAt, uint256 currentTimestamp);

    event DevelopmentRatePublished(
        address indexed publisher,
        address indexed rateIndex,
        uint256 previousRate,
        uint256 newRate,
        uint64 observedAt,
        string sourceLabel
    );

    function run() external {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        string memory confirmation = vm.envString("YELTRA_RATE_OPTIONS_PUBLISH_TESTNET_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        address publisher = vm.envAddress("YELTRA_OPTIONS_RATE_PUBLISHER_TESTNET");
        if (publisher == EXPOSED_HISTORICAL_ADMIN) revert ExposedHistoricalAdminForbidden();
        address indexAddress = vm.envAddress("NEXT_PUBLIC_YELTRA_OPTIONS_RATE_INDEX_TESTNET");
        uint256 updatedRate = vm.envUint("YELTRA_OPTIONS_UPDATED_RATE_TESTNET");
        if (
            publisher == address(0)
                || indexAddress == address(0)
                || indexAddress.code.length == 0
                || updatedRate > RATE_SCALE
        ) {
            revert InvalidConfiguration();
        }

        YeltraRateIndex index = YeltraRateIndex(indexAddress);
        string memory sourceLabel = index.sourceLabel();
        if (keccak256(bytes(sourceLabel)) != keccak256(bytes("TESTNET DEVELOPMENT RATE INDEX"))) {
            revert DevelopmentIndexRequired();
        }
        IYeltraOptionsRatePublisherAccess authority =
            IYeltraOptionsRatePublisherAccess(address(index.accessManager()));
        if (!authority.hasRole(ADMIN_ROLE, publisher) && !authority.hasRole(OPERATOR_ROLE, publisher)) {
            revert UnauthorizedPublisher(publisher);
        }

        uint64 observedAt = uint64(block.timestamp);
        uint64 previousObservedAt = index.latestObservedAt();
        if (observedAt <= previousObservedAt) {
            revert ObservationNotAdvanced(previousObservedAt, block.timestamp);
        }
        uint256 previousRate = index.latestRate();

        emit DevelopmentRatePublished(publisher, indexAddress, previousRate, updatedRate, observedAt, sourceLabel);
        vm.startBroadcast(publisher);
        index.publishRate(updatedRate, observedAt);
        vm.stopBroadcast();
    }
}
