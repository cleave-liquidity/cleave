// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraOptionsCollateralVault} from "../src/YeltraOptionsCollateralVault.sol";
import {YeltraRateIndex} from "../src/YeltraRateIndex.sol";
import {YeltraRateOptionsMarket} from "../src/YeltraRateOptionsMarket.sol";

interface VmYeltraRateOptionsTestnet {
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envString(string calldata name) external returns (string memory value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

interface IYeltraRateOptionsAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title DeployYeltraRateOptionsTestnet
/// @notice Guarded deployment package for the isolated Testnet Yield Rate
///         Options development MVP.
/// @dev It deliberately requires an explicit collateral-token address. The
///      repository does not contain a verified Testnet collateral deployment,
///      so this script cannot invent one or silently use Mainnet USDG.
contract DeployYeltraRateOptionsTestnet {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 private constant CONFIRMATION_HASH = keccak256("YELTRA_RATE_OPTIONS_TESTNET_46630");
    address private constant DEFAULT_ACCESS_MANAGER = 0x3aaB079e0017aF37C15C7aB11e319995cf426097;
    VmYeltraRateOptionsTestnet private constant vm =
        VmYeltraRateOptionsTestnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error MissingPrivateKey();
    error MissingCollateralToken();
    error InvalidConfiguration();
    error DeployerMissingRole(address deployer);

    event YeltraRateOptionsTestnetDeployed(
        address indexed rateIndex,
        address indexed collateralVault,
        address indexed market,
        address accessManager,
        address collateralToken,
        uint256 initialRate,
        uint256 initialObservedAt,
        uint256 maxStaleness
    );

    function run()
        external
        returns (YeltraRateIndex rateIndex, YeltraOptionsCollateralVault collateralVault, YeltraRateOptionsMarket market)
    {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        string memory confirmation = vm.envString("YELTRA_RATE_OPTIONS_TESTNET_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        uint256 privateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (privateKey == 0) revert MissingPrivateKey();
        address deployer = vm.addr(privateKey);
        address accessManager = vm.envOr("YELTRA_OPTIONS_ACCESS_MANAGER_TESTNET", DEFAULT_ACCESS_MANAGER);
        address collateralToken = vm.envOr("YELTRA_OPTIONS_COLLATERAL_TOKEN_TESTNET", address(0));
        uint256 initialRate = vm.envOr("YELTRA_OPTIONS_INITIAL_RATE_TESTNET", uint256(0));
        uint256 maxStaleness = vm.envOr("YELTRA_OPTIONS_MAX_STALENESS_TESTNET", uint256(86_400));
        if (collateralToken == address(0)) revert MissingCollateralToken();
        if (accessManager == address(0) || accessManager.code.length == 0 || collateralToken.code.length == 0) {
            revert InvalidConfiguration();
        }
        if (initialRate > 1e18 || maxStaleness == 0) revert InvalidConfiguration();

        IYeltraRateOptionsAccess authority = IYeltraRateOptionsAccess(accessManager);
        if (!authority.hasRole(ADMIN_ROLE, deployer) && !authority.hasRole(OPERATOR_ROLE, deployer)) {
            revert DeployerMissingRole(deployer);
        }

        vm.startBroadcast(privateKey);
        rateIndex = new YeltraRateIndex(
            accessManager,
            "TESTNET DEVELOPMENT RATE INDEX",
            initialRate,
            uint64(block.timestamp),
            maxStaleness
        );
        collateralVault = new YeltraOptionsCollateralVault(accessManager, collateralToken);
        market = new YeltraRateOptionsMarket(address(rateIndex), address(collateralVault), collateralToken);
        collateralVault.setMarket(address(market));
        vm.stopBroadcast();

        emit YeltraRateOptionsTestnetDeployed(
            address(rateIndex),
            address(collateralVault),
            address(market),
            accessManager,
            collateralToken,
            initialRate,
            block.timestamp,
            maxStaleness
        );
    }
}
