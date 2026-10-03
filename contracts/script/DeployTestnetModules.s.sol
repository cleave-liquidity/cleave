// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "../src/CleaveAccessManager.sol";
import {CleaveAdapterRegistry} from "../src/CleaveAdapterRegistry.sol";
import {CleaveExecutionRouter} from "../src/CleaveExecutionRouter.sol";
import {CleaveLens} from "../src/CleaveLens.sol";
import {CleaveLifecycleManager} from "../src/CleaveLifecycleManager.sol";
import {CleaveMarketRegistry} from "../src/CleaveMarketRegistry.sol";
import {CleaveRiskGuard} from "../src/CleaveRiskGuard.sol";

interface VmTestnet {
    function envUint(string calldata name) external returns (uint256 value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @title DeployTestnetModules
/// @notice Deploys the seven new modules around the already deployed Testnet registry.
contract DeployTestnetModules {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    address public constant EXISTING_REGISTRY = 0xa5D21B39258DA11152a0E63135936b1E60ACFe43;
    VmTestnet private constant vm = VmTestnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingPrivateKey();
    error DeployerNeedsTestnetEth(address deployer);

    event TestnetModulesDeployed(
        address indexed existingRegistry,
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
            CleaveAccessManager accessManager,
            CleaveAdapterRegistry adapterRegistry,
            CleaveMarketRegistry marketRegistry,
            CleaveRiskGuard riskGuard,
            CleaveExecutionRouter executionRouter,
            CleaveLifecycleManager lifecycleManager,
            CleaveLens lens
        )
    {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);

        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        if (privateKey == 0) revert MissingPrivateKey();
        address deployer = vm.addr(privateKey);
        if (deployer.balance == 0) revert DeployerNeedsTestnetEth(deployer);

        vm.startBroadcast(privateKey);
        accessManager = new CleaveAccessManager(deployer);
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
            EXISTING_REGISTRY,
            address(accessManager),
            address(adapterRegistry),
            address(marketRegistry),
            address(riskGuard),
            address(executionRouter),
            address(lifecycleManager)
        );
        vm.stopBroadcast();

        emit TestnetModulesDeployed(
            EXISTING_REGISTRY,
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
