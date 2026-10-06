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

interface VmYeltraTestnet {
    function envUint(string calldata name) external returns (uint256 value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @title DeployYeltraTestnet
/// @notice Deploys a clean YELTRA graph without a fabricated adapter or market.
contract DeployYeltraTestnet {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    VmYeltraTestnet private constant vm = VmYeltraTestnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingPrivateKey();
    error DeployerNeedsTestnetEth(address deployer);

    event YeltraTestnetDeployed(
        address indexed registry,
        address indexed accessManager,
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
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);

        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        if (privateKey == 0) revert MissingPrivateKey();
        address deployer = vm.addr(privateKey);
        if (deployer.balance == 0) revert DeployerNeedsTestnetEth(deployer);

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
        vm.stopBroadcast();

        emit YeltraTestnetDeployed(
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
