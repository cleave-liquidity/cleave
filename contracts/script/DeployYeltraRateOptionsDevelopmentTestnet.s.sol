// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraOptionsCollateralVault} from "../src/YeltraOptionsCollateralVault.sol";
import {YeltraRateIndex} from "../src/YeltraRateIndex.sol";
import {YeltraRateOptionsMarket} from "../src/YeltraRateOptionsMarket.sol";
import {YeltraTestnetDevelopmentCollateral} from "../src/YeltraTestnetDevelopmentCollateral.sol";

interface VmYeltraRateOptionsDevelopmentTestnet {
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envString(string calldata name) external returns (string memory value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

interface IYeltraRateOptionsDevelopmentAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title DeployYeltraRateOptionsDevelopmentTestnet
/// @notice Guarded deployment for the isolated yDEVUSD Testnet demonstration.
/// @dev This script is chain-gated to 46630 and never deploys to Mainnet.
contract DeployYeltraRateOptionsDevelopmentTestnet {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant CONFIRMATION_HASH =
        keccak256("YELTRA_RATE_OPTIONS_DEVELOPMENT_TESTNET_46630");
    address private constant DEFAULT_ACCESS_MANAGER = 0x3aaB079e0017aF37C15C7aB11e319995cf426097;
    VmYeltraRateOptionsDevelopmentTestnet private constant vm =
        VmYeltraRateOptionsDevelopmentTestnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error MissingPrivateKey();
    error InvalidConfiguration();
    error DeployerMissingAdminRole(address deployer);

    event YeltraRateOptionsDevelopmentTestnetDeployed(
        address indexed collateralToken,
        address indexed rateIndex,
        address indexed collateralVault,
        address market,
        address accessManager,
        uint256 initialRate,
        uint256 initialObservedAt,
        uint256 maxStaleness
    );

    function run()
        external
        returns (
            YeltraTestnetDevelopmentCollateral collateralToken,
            YeltraRateIndex rateIndex,
            YeltraOptionsCollateralVault collateralVault,
            YeltraRateOptionsMarket market
        )
    {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        string memory confirmation = vm.envString("YELTRA_RATE_OPTIONS_DEVELOPMENT_TESTNET_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        uint256 privateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (privateKey == 0) revert MissingPrivateKey();
        address deployer = vm.addr(privateKey);
        address accessManager = vm.envOr("YELTRA_OPTIONS_ACCESS_MANAGER_TESTNET", DEFAULT_ACCESS_MANAGER);
        uint256 initialRate = vm.envOr("YELTRA_OPTIONS_INITIAL_RATE_TESTNET", uint256(0));
        uint256 maxStaleness = vm.envOr("YELTRA_OPTIONS_MAX_STALENESS_TESTNET", uint256(86_400));
        if (accessManager == address(0) || accessManager.code.length == 0) revert InvalidConfiguration();
        if (initialRate > 1e18 || maxStaleness == 0) revert InvalidConfiguration();

        IYeltraRateOptionsDevelopmentAccess authority = IYeltraRateOptionsDevelopmentAccess(accessManager);
        if (!authority.hasRole(ADMIN_ROLE, deployer)) revert DeployerMissingAdminRole(deployer);

        vm.startBroadcast(privateKey);
        collateralToken = new YeltraTestnetDevelopmentCollateral(accessManager);
        rateIndex = new YeltraRateIndex(
            accessManager,
            "TESTNET DEVELOPMENT RATE INDEX",
            initialRate,
            uint64(block.timestamp),
            maxStaleness
        );
        collateralVault = new YeltraOptionsCollateralVault(accessManager, address(collateralToken));
        market = new YeltraRateOptionsMarket(address(rateIndex), address(collateralVault), address(collateralToken));
        collateralVault.setMarket(address(market));
        vm.stopBroadcast();

        emit YeltraRateOptionsDevelopmentTestnetDeployed(
            address(collateralToken),
            address(rateIndex),
            address(collateralVault),
            address(market),
            accessManager,
            initialRate,
            block.timestamp,
            maxStaleness
        );
    }
}
