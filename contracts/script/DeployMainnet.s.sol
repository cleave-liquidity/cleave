// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "../src/CleaveAccessManager.sol";
import {CleaveAdapterRegistry} from "../src/CleaveAdapterRegistry.sol";
import {CleaveExecutionRouter} from "../src/CleaveExecutionRouter.sol";
import {CleaveLens} from "../src/CleaveLens.sol";
import {CleaveLifecycleManager} from "../src/CleaveLifecycleManager.sol";
import {CleaveMarketRegistry} from "../src/CleaveMarketRegistry.sol";
import {CleaveRegistry} from "../src/CleaveRegistry.sol";
import {CleaveRiskGuard} from "../src/CleaveRiskGuard.sol";

interface VmMainnet {
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envString(string calldata name) external returns (string memory value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envOr(string calldata name, bytes32 defaultValue) external returns (bytes32 value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @title DeployMainnet
/// @notice Mainnet-preparation script. It cannot run without explicit confirmation for chain 4663.
contract DeployMainnet {
    uint256 private constant MAINNET_CHAIN_ID = 4663;
    bytes32 private constant CONFIRMATION_HASH = keccak256("CLEAVE_MAINNET_DEPLOY_4663");
    VmMainnet private constant vm = VmMainnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingMainnetPrivateKey();
    error MissingMainnetConfirmation();
    error DeployerNeedsMainnetEth(address deployer);

    event MainnetModulesPrepared(
        address registry,
        address accessManager,
        address adapterRegistry,
        address marketRegistry,
        address riskGuard,
        address executionRouter,
        address lifecycleManager,
        address lens,
        address indexed deployer
    );

    function run()
        external
        returns (
            CleaveRegistry registry,
            CleaveAccessManager accessManager,
            CleaveAdapterRegistry adapterRegistry,
            CleaveMarketRegistry marketRegistry,
            CleaveRiskGuard riskGuard,
            CleaveExecutionRouter executionRouter,
            CleaveLifecycleManager lifecycleManager,
            CleaveLens lens
        )
    {
        if (block.chainid != MAINNET_CHAIN_ID) revert WrongChain(block.chainid);

        string memory confirmation = vm.envString("CLEAVE_MAINNET_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingMainnetConfirmation();

        uint256 privateKey = vm.envOr("MAINNET_DEPLOYER_PRIVATE_KEY", uint256(0));
        if (privateKey == 0) revert MissingMainnetPrivateKey();
        address deployer = vm.addr(privateKey);
        if (deployer.balance == 0) revert DeployerNeedsMainnetEth(deployer);

        vm.startBroadcast(privateKey);
        accessManager = new CleaveAccessManager(deployer);
        registry = new CleaveRegistry(deployer);
        adapterRegistry = new CleaveAdapterRegistry(address(accessManager));
        marketRegistry = new CleaveMarketRegistry(address(accessManager), address(adapterRegistry));
        riskGuard = new CleaveRiskGuard(address(accessManager));
        executionRouter = new CleaveExecutionRouter(
            address(accessManager),
            address(adapterRegistry),
            address(marketRegistry),
            address(riskGuard)
        );
        lifecycleManager = new CleaveLifecycleManager(address(marketRegistry));
        lens = new CleaveLens(
            address(registry),
            address(accessManager),
            address(adapterRegistry),
            address(marketRegistry),
            address(riskGuard),
            address(executionRouter),
            address(lifecycleManager)
        );

        address pendleRouter = vm.envOr("PENDLE_MAINNET_ROUTER", address(0));
        if (pendleRouter != address(0)) {
            bytes32 adapterId = vm.envOr("PENDLE_MAINNET_ADAPTER_ID", bytes32("PENDLE"));
            adapterRegistry.registerAdapter(adapterId, bytes32("PENDLE"), pendleRouter, MAINNET_CHAIN_ID);
        }
        vm.stopBroadcast();

        emit MainnetModulesPrepared(
            address(registry),
            address(accessManager),
            address(adapterRegistry),
            address(marketRegistry),
            address(riskGuard),
            address(executionRouter),
            address(lifecycleManager),
            address(lens),
            deployer
        );
    }
}
