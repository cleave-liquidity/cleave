// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraAccessManager} from "../src/YeltraAccessManager.sol";
import {YeltraAdapterRegistry} from "../src/YeltraAdapterRegistry.sol";
import {YeltraExecutionRouter} from "../src/YeltraExecutionRouter.sol";
import {YeltraLens} from "../src/YeltraLens.sol";
import {YeltraLifecycleManager} from "../src/YeltraLifecycleManager.sol";
import {YeltraMarketRegistry} from "../src/YeltraMarketRegistry.sol";
import {YeltraRegistry} from "../src/YeltraRegistry.sol";
import {YeltraRiskGuard} from "../src/YeltraRiskGuard.sol";

interface VmYeltraMainnet {
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envString(string calldata name) external returns (string memory value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envOr(string calldata name, bytes32 defaultValue) external returns (bytes32 value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @title DeployYeltraMainnet
/// @notice Deploys the fresh YELTRA graph and reproduces the external adapter.
/// @dev Market records are migrated by the read-live TypeScript migration step.
contract DeployYeltraMainnet {
    uint256 private constant MAINNET_CHAIN_ID = 4663;
    bytes32 private constant CONFIRMATION_HASH = keccak256("YELTRA_MAINNET_DEPLOY_4663");
    VmYeltraMainnet private constant vm = VmYeltraMainnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingMainnetPrivateKey();
    error MissingMainnetConfirmation();
    error DeployerNeedsMainnetEth(address deployer);

    event YeltraMainnetDeployed(
        address indexed registry,
        address indexed accessManager,
        address adapterRegistry,
        address marketRegistry,
        address riskGuard,
        address executionRouter,
        address lifecycleManager,
        address lens,
        address indexed deployer,
        bytes32 adapterId,
        address pendleRouter
    );

    function run()
        external
        returns (
            YeltraRegistry registry,
            YeltraAccessManager accessManager,
            YeltraAdapterRegistry adapterRegistry,
            YeltraMarketRegistry marketRegistry,
            YeltraRiskGuard riskGuard,
            YeltraExecutionRouter executionRouter,
            YeltraLifecycleManager lifecycleManager,
            YeltraLens lens
        )
    {
        if (block.chainid != MAINNET_CHAIN_ID) revert WrongChain(block.chainid);

        string memory confirmation = vm.envString("YELTRA_MAINNET_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingMainnetConfirmation();

        uint256 privateKey = vm.envOr("MAINNET_DEPLOYER_PRIVATE_KEY", uint256(0));
        if (privateKey == 0) revert MissingMainnetPrivateKey();
        address deployer = vm.addr(privateKey);
        if (deployer.balance == 0) revert DeployerNeedsMainnetEth(deployer);

        address pendleRouter = vm.envOr("PENDLE_MAINNET_ROUTER", address(0));
        bytes32 adapterId = vm.envOr("PENDLE_MAINNET_ADAPTER_ID", bytes32("PENDLE"));

        vm.startBroadcast(privateKey);
        accessManager = new YeltraAccessManager(deployer);
        registry = new YeltraRegistry(deployer);
        adapterRegistry = new YeltraAdapterRegistry(address(accessManager));
        marketRegistry = new YeltraMarketRegistry(address(accessManager), address(adapterRegistry));
        riskGuard = new YeltraRiskGuard(address(accessManager));
        executionRouter = new YeltraExecutionRouter(
            address(accessManager),
            address(adapterRegistry),
            address(marketRegistry),
            address(riskGuard)
        );
        lifecycleManager = new YeltraLifecycleManager(address(marketRegistry));
        lens = new YeltraLens(
            address(registry),
            address(accessManager),
            address(adapterRegistry),
            address(marketRegistry),
            address(riskGuard),
            address(executionRouter),
            address(lifecycleManager)
        );
        if (pendleRouter != address(0)) {
            adapterRegistry.registerAdapter(adapterId, bytes32("PENDLE"), pendleRouter, MAINNET_CHAIN_ID);
        }
        vm.stopBroadcast();

        emit YeltraMainnetDeployed(
            address(registry),
            address(accessManager),
            address(adapterRegistry),
            address(marketRegistry),
            address(riskGuard),
            address(executionRouter),
            address(lifecycleManager),
            address(lens),
            deployer,
            adapterId,
            pendleRouter
        );
    }
}
