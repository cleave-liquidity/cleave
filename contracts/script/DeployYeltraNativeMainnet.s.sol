// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraMarketFactory} from "../src/YeltraMarketFactory.sol";
import {YeltraNativeMarketRegistry} from "../src/YeltraNativeMarketRegistry.sol";
import {YeltraRouter} from "../src/YeltraRouter.sol";

interface VmYeltraNativeMainnet {
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envOr(string calldata name, bytes32 defaultValue) external returns (bytes32 value);
    function envString(string calldata name) external returns (string memory value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

interface IYeltraNativeSource {
    function asset() external view returns (address);
}

interface IYeltraNativeAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title DeployYeltraNativeMainnet
/// @notice Guarded, one-market deployment package for the native USDG canary.
/// @dev This script is intentionally not invoked by any default package command.
///      It requires an exact human confirmation string before broadcasting.
contract DeployYeltraNativeMainnet {
    uint256 private constant MAINNET_CHAIN_ID = 4663;
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 private constant CONFIRMATION_HASH = keccak256("YELTRA_NATIVE_MAINNET_CANARY_4663");
    address private constant DEFAULT_ACCESS_MANAGER = 0xB12c7112446BfE88d6e82b516F5Df90449Fa3DC4;
    address private constant DEFAULT_SOURCE_VAULT = 0xBeEff033F34C046626B8D0A041844C5d1A5409dd;
    address private constant DEFAULT_UNDERLYING = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    VmYeltraNativeMainnet private constant vm =
        VmYeltraNativeMainnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error MissingPrivateKey();
    error InvalidAddress();
    error InvalidSourceAsset(address expected, address actual);
    error DeployerMissingRole(address deployer);
    error InvalidMaturity(uint256 maturity);

    struct CanaryConfig {
        uint256 privateKey;
        address deployer;
        address accessManager;
        address sourceVault;
        address underlying;
        uint256 maturity;
        bytes32 marketId;
    }

    event YeltraNativeMainnetDeployed(
        address indexed registry,
        address indexed factory,
        address indexed market,
        address router,
        address pt,
        address yt,
        address sourceAdapter,
        address accessManager,
        address sourceVault,
        address underlying,
        uint256 maturity,
        bytes32 marketId
    );

    function run()
        external
        returns (
            YeltraNativeMarketRegistry registry,
            YeltraMarketFactory factory,
            YeltraRouter router,
            address market,
            address pt,
            address yt,
            address sourceAdapter
        )
    {
        if (block.chainid != MAINNET_CHAIN_ID) revert WrongChain(block.chainid);

        CanaryConfig memory config = _loadConfig();

        vm.startBroadcast(config.privateKey);
        registry = new YeltraNativeMarketRegistry(config.accessManager);
        router = new YeltraRouter(address(registry));
        factory = new YeltraMarketFactory(config.accessManager, address(registry), address(router));
        registry.setFactory(address(factory));
        factory.approveSource(config.sourceVault, true);
        (market, pt, yt, sourceAdapter) = factory.createMarket(
            YeltraMarketFactory.MarketRequest({
                marketId: config.marketId,
                sourceVault: config.sourceVault,
                maturity: config.maturity,
                ptName: "Yeltra Principal USDG",
                ptSymbol: "yPT-USDG",
                ytName: "Yeltra Yield USDG",
                ytSymbol: "yYT-USDG"
            })
        );
        vm.stopBroadcast();

        emit YeltraNativeMainnetDeployed(
            address(registry),
            address(factory),
            market,
            address(router),
            pt,
            yt,
            sourceAdapter,
            config.accessManager,
            config.sourceVault,
            config.underlying,
            config.maturity,
            config.marketId
        );
    }

    function _loadConfig() private returns (CanaryConfig memory config) {
        string memory confirmation = vm.envString("YELTRA_NATIVE_MAINNET_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        config.privateKey = vm.envOr("MAINNET_DEPLOYER_PRIVATE_KEY", uint256(0));
        if (config.privateKey == 0) revert MissingPrivateKey();
        config.deployer = vm.addr(config.privateKey);
        config.accessManager = vm.envOr("YELTRA_NATIVE_ACCESS_MANAGER", DEFAULT_ACCESS_MANAGER);
        config.sourceVault = vm.envOr("YELTRA_NATIVE_SOURCE_VAULT", DEFAULT_SOURCE_VAULT);
        config.underlying = vm.envOr("YELTRA_NATIVE_UNDERLYING", DEFAULT_UNDERLYING);
        config.maturity = vm.envOr("YELTRA_NATIVE_MATURITY", uint256(0));
        config.marketId = vm.envOr("YELTRA_NATIVE_MARKET_ID", keccak256(bytes("USDG-STEAKHOUSE-YELTRA-CANARY")));
        if (
            config.accessManager == address(0) || config.sourceVault == address(0) || config.underlying == address(0)
                || config.marketId == bytes32(0)
        ) revert InvalidAddress();
        if (config.maturity <= block.timestamp) revert InvalidMaturity(config.maturity);

        address actualUnderlying = IYeltraNativeSource(config.sourceVault).asset();
        if (actualUnderlying != config.underlying) revert InvalidSourceAsset(config.underlying, actualUnderlying);

        IYeltraNativeAccess accessManager = IYeltraNativeAccess(config.accessManager);
        if (
            !accessManager.hasRole(ADMIN_ROLE, config.deployer)
                && !accessManager.hasRole(OPERATOR_ROLE, config.deployer)
        ) {
            revert DeployerMissingRole(config.deployer);
        }
    }
}
