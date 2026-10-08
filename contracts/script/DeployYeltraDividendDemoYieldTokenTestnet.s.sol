// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraDividendDemoYieldToken} from "../src/YeltraDividendDemoYieldToken.sol";

interface VmDeployYeltraDividendDemo {
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envString(string calldata name) external returns (string memory value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

interface IYeltraDividendDemoAuthority {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @notice Guarded Testnet-only deploy for the non-transferable synthetic exposure marker.
contract DeployYeltraDividendDemoYieldTokenTestnet {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 private constant CONFIRMATION_HASH = keccak256("YELTRA_DIVIDEND_DEMO_DEPLOY_46630");
    address private constant DEFAULT_ACCESS_MANAGER = 0x3aaB079e0017aF37C15C7aB11e319995cf426097;
    VmDeployYeltraDividendDemo private constant vm =
        VmDeployYeltraDividendDemo(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error MissingPrivateKey();
    error InvalidConfiguration();
    error DeployerMissingOperator(address deployer);

    event DividendDemoYieldTokenDeployed(address indexed token, address indexed demoWallet, address indexed accessManager);

    function run() external returns (YeltraDividendDemoYieldToken token) {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        string memory confirmation = vm.envString("YELTRA_DIVIDEND_DEMO_DEPLOY_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        uint256 privateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (privateKey == 0) revert MissingPrivateKey();
        address deployer = vm.addr(privateKey);
        address demoWallet = vm.envOr("YELTRA_DIVIDEND_DEMO_WALLET_TESTNET", address(0));
        address accessManager = vm.envOr("YELTRA_DIVIDEND_ACCESS_MANAGER", DEFAULT_ACCESS_MANAGER);
        if (demoWallet == address(0) || accessManager.code.length == 0) revert InvalidConfiguration();
        if (!IYeltraDividendDemoAuthority(accessManager).hasRole(OPERATOR_ROLE, deployer)) {
            revert DeployerMissingOperator(deployer);
        }

        vm.startBroadcast(privateKey);
        token = new YeltraDividendDemoYieldToken(accessManager, demoWallet);
        vm.stopBroadcast();
        emit DividendDemoYieldTokenDeployed(address(token), demoWallet, accessManager);
    }
}
