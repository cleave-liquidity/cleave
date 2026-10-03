// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveRegistry} from "../src/CleaveRegistry.sol";

interface Vm {
    function envUint(string calldata name) external returns (uint256 value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract Deploy {
    error WrongChain(uint256 actualChainId);
    error MissingPrivateKey();
    error DeployerNeedsTestnetEth(address deployer);

    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    event CleaveRegistryDeployed(address indexed registry, address indexed deployer, uint256 indexed chainId);

    function run() external returns (CleaveRegistry registry) {
        if (block.chainid != 46630) revert WrongChain(block.chainid);

        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        if (privateKey == 0) revert MissingPrivateKey();

        address deployer = vm.addr(privateKey);
        if (deployer.balance == 0) revert DeployerNeedsTestnetEth(deployer);

        vm.startBroadcast(privateKey);
        registry = new CleaveRegistry(deployer);
        vm.stopBroadcast();

        emit CleaveRegistryDeployed(address(registry), deployer, block.chainid);
    }
}
