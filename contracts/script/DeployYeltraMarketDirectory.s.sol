// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraMarketDirectory} from "../src/YeltraMarketDirectory.sol";

interface VmYeltraMarketDirectory {
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envString(string calldata name) external returns (string memory value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

interface IYeltraMarketDirectoryAccessManager {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title DeployYeltraMarketDirectory
/// @notice Guarded one-contract Mainnet deployment for the external market directory.
/// @dev This script never deploys the existing YELTRA core graph or any external market.
contract DeployYeltraMarketDirectory {
    uint256 private constant MAINNET_CHAIN_ID = 4663;
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 private constant CONFIRMATION_HASH = keccak256("YELTRA_MARKET_DIRECTORY_MAINNET_4663");
    address private constant DEFAULT_ACCESS_MANAGER = 0xB12c7112446BfE88d6e82b516F5Df90449Fa3DC4;
    VmYeltraMarketDirectory private constant vm =
        VmYeltraMarketDirectory(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error MissingPrivateKey();
    error InvalidAccessManager();
    error DeployerMissingRole(address deployer);

    event YeltraMarketDirectoryDeployed(
        address indexed directory,
        address indexed accessManager,
        address indexed deployer,
        uint256 chainId
    );

    function run() external returns (YeltraMarketDirectory directory) {
        if (block.chainid != MAINNET_CHAIN_ID) revert WrongChain(block.chainid);

        string memory confirmation = vm.envString("YELTRA_MARKET_DIRECTORY_MAINNET_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        uint256 privateKey = vm.envOr("MAINNET_DEPLOYER_PRIVATE_KEY", uint256(0));
        if (privateKey == 0) revert MissingPrivateKey();

        address deployer = vm.addr(privateKey);
        address accessManager = vm.envOr("YELTRA_MARKET_DIRECTORY_ACCESS_MANAGER", DEFAULT_ACCESS_MANAGER);
        if (accessManager == address(0) || accessManager.code.length == 0) revert InvalidAccessManager();

        IYeltraMarketDirectoryAccessManager authority = IYeltraMarketDirectoryAccessManager(accessManager);
        if (!authority.hasRole(ADMIN_ROLE, deployer) && !authority.hasRole(OPERATOR_ROLE, deployer)) {
            revert DeployerMissingRole(deployer);
        }

        vm.startBroadcast(privateKey);
        directory = new YeltraMarketDirectory(accessManager);
        vm.stopBroadcast();

        emit YeltraMarketDirectoryDeployed(address(directory), accessManager, deployer, block.chainid);
    }
}
