// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraAccessManager} from "../src/YeltraAccessManager.sol";
import {YeltraOptionsCollateralVault} from "../src/YeltraOptionsCollateralVault.sol";
import {YeltraRateIndex} from "../src/YeltraRateIndex.sol";
import {YeltraRateOptionsMarket} from "../src/YeltraRateOptionsMarket.sol";
import {YeltraTestnetDevelopmentCollateral} from "../src/YeltraTestnetDevelopmentCollateral.sol";

interface VmYeltraRateOptionsFreshAdminTestnet {
    function envAddress(string calldata name) external returns (address value);
    function envString(string calldata name) external returns (string memory value);
    function envUint(string calldata name) external returns (uint256 value);
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function startBroadcast(address account) external;
    function stopBroadcast() external;
}

/// @title DeployYeltraRateOptionsFreshAdminTestnet
/// @notice Deploys an isolated Testnet Options stack with a new YELTRA admin.
/// @dev Never uses the historical admin or any raw private-key environment value.
contract DeployYeltraRateOptionsFreshAdminTestnet {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    uint256 private constant RATE_SCALE = 1e18;
    address private constant EXPOSED_HISTORICAL_ADMIN = 0x1e1AD136fb877aB473834E869407C7ae59fCFe8B;
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 private constant GUARDIAN_ROLE = keccak256("CLEAVE_GUARDIAN");
    bytes32 private constant CONFIRMATION_HASH =
        keccak256("YELTRA_OPTIONS_FRESH_ADMIN_DEPLOY_TESTNET_46630");
    VmYeltraRateOptionsFreshAdminTestnet private constant vm =
        VmYeltraRateOptionsFreshAdminTestnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error InvalidAdmin(address admin);
    error InvalidConfiguration();
    error PostDeploymentValidationFailed();

    event YeltraRateOptionsFreshAdminTestnetDeployed(
        address indexed admin,
        address indexed accessManager,
        address collateralToken,
        address rateIndex,
        address collateralVault,
        address market,
        uint256 initialDevelopmentRate,
        uint256 maxStaleness
    );

    function run()
        external
        returns (
            YeltraAccessManager accessManager,
            YeltraTestnetDevelopmentCollateral collateralToken,
            YeltraRateIndex rateIndex,
            YeltraOptionsCollateralVault collateralVault,
            YeltraRateOptionsMarket market
        )
    {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        string memory confirmation = vm.envString("YELTRA_OPTIONS_FRESH_ADMIN_DEPLOY_TESTNET_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        address admin = vm.envAddress("YELTRA_OPTIONS_FRESH_ADMIN_TESTNET");
        if (admin == address(0) || admin == EXPOSED_HISTORICAL_ADMIN || admin.code.length != 0) {
            revert InvalidAdmin(admin);
        }

        // No default rate: the caller must explicitly configure development-only data.
        uint256 initialRate = vm.envUint("YELTRA_OPTIONS_INITIAL_RATE_TESTNET");
        uint256 maxStaleness = vm.envOr("YELTRA_OPTIONS_MAX_STALENESS_TESTNET", 86_400);
        if (initialRate > RATE_SCALE || maxStaleness == 0 || block.timestamp == 0) {
            revert InvalidConfiguration();
        }

        vm.startBroadcast(admin);
        accessManager = new YeltraAccessManager(admin);
        collateralToken = new YeltraTestnetDevelopmentCollateral(address(accessManager));
        rateIndex = new YeltraRateIndex(
            address(accessManager),
            "TESTNET DEVELOPMENT RATE INDEX",
            initialRate,
            uint64(block.timestamp),
            maxStaleness
        );
        collateralVault = new YeltraOptionsCollateralVault(address(accessManager), address(collateralToken));
        market = new YeltraRateOptionsMarket(address(rateIndex), address(collateralVault), address(collateralToken));
        collateralVault.setMarket(address(market));
        vm.stopBroadcast();

        bool rolesValid = accessManager.hasRole(ADMIN_ROLE, admin)
            && accessManager.hasRole(OPERATOR_ROLE, admin)
            && accessManager.hasRole(GUARDIAN_ROLE, admin);
        bool wiringValid = address(collateralToken.accessManager()) == address(accessManager)
            && address(rateIndex.accessManager()) == address(accessManager)
            && address(collateralVault.accessManager()) == address(accessManager)
            && collateralVault.collateralToken() == address(collateralToken)
            && collateralVault.market() == address(market)
            && address(market.rateIndex()) == address(rateIndex)
            && address(market.collateralVault()) == address(collateralVault)
            && market.collateralToken() == address(collateralToken)
            && collateralToken.DEVELOPMENT_ONLY()
            && collateralToken.decimals() == 6
            && collateralToken.totalSupply() == 0
            && collateralVault.totalBalance() == 0
            && collateralVault.lockedCollateral() == 0
            && collateralVault.reservedPayout() == 0
            && market.nextOptionId() == 1
            && rateIndex.isFresh();
        if (!rolesValid || !wiringValid) revert PostDeploymentValidationFailed();

        emit YeltraRateOptionsFreshAdminTestnetDeployed(
            admin,
            address(accessManager),
            address(collateralToken),
            address(rateIndex),
            address(collateralVault),
            address(market),
            initialRate,
            maxStaleness
        );
    }
}
