// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraDividendLens} from "../src/YeltraDividendLens.sol";
import {YeltraDividendRegistry} from "../src/YeltraDividendRegistry.sol";

interface VmYeltraDividendTestnet {
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envString(string calldata name) external returns (string memory value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

interface IYeltraDividendTestnetAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title DeployYeltraDividendTestnet
/// @notice Guarded testnet-only deployment of the Dividend Earn accounting/read layer.
/// @dev This deploys no market configuration and no settlement asset. It cannot affect Mainnet.
contract DeployYeltraDividendTestnet {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 private constant CONFIRMATION_HASH = keccak256("YELTRA_DIVIDEND_TESTNET_46630");
    address private constant DEFAULT_ACCESS_MANAGER = 0x3aaB079e0017aF37C15C7aB11e319995cf426097;
    VmYeltraDividendTestnet private constant vm =
        VmYeltraDividendTestnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error MissingPrivateKey();
    error InvalidAccessManager();
    error DeployerMissingRole(address deployer);

    event YeltraDividendTestnetDeployed(
        address indexed registry,
        address indexed accounting,
        address indexed lens,
        address accessManager,
        address deployer
    );

    function run() external returns (YeltraDividendRegistry registry, YeltraDividendLens lens) {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        string memory confirmation = vm.envString("YELTRA_DIVIDEND_TESTNET_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        uint256 privateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (privateKey == 0) revert MissingPrivateKey();
        address deployer = vm.addr(privateKey);
        address accessManager = vm.envOr("YELTRA_DIVIDEND_ACCESS_MANAGER", DEFAULT_ACCESS_MANAGER);
        if (accessManager == address(0) || accessManager.code.length == 0) revert InvalidAccessManager();
        IYeltraDividendTestnetAccess authority = IYeltraDividendTestnetAccess(accessManager);
        if (!authority.hasRole(ADMIN_ROLE, deployer) && !authority.hasRole(OPERATOR_ROLE, deployer)) {
            revert DeployerMissingRole(deployer);
        }

        vm.startBroadcast(privateKey);
        registry = new YeltraDividendRegistry(accessManager);
        lens = new YeltraDividendLens(address(registry));
        vm.stopBroadcast();
        emit YeltraDividendTestnetDeployed(address(registry), address(registry.accounting()), address(lens), accessManager, deployer);
    }
}
