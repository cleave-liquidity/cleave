// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraDividendDemoYieldToken} from "../src/YeltraDividendDemoYieldToken.sol";

interface VmSetupYeltraDividendDemo {
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envString(string calldata name) external returns (string memory value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

interface IYeltraDividendDemoSetupAuthority {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

interface IYeltraDividendDemoSetupRegistry {
    struct MarketConfig {
        address underlying;
        address sourceAdapter;
        uint16 protocolFeeBps;
        uint256 lastRateBaseUnits;
        uint8 lastRateDecimals;
        bytes32 lastEventId;
        uint64 lastEventTimestamp;
        uint64 lastSequence;
        bool enabled;
        bool paused;
    }

    function accounting() external view returns (address);
    function getMarket(bytes32 marketId) external view returns (MarketConfig memory);
    function configureMarket(bytes32 marketId, address underlying, address sourceAdapter, uint8 exposureDecimals, uint8 rewardDecimals, uint16 protocolFeeBps) external;
    function registerPosition(bytes32 positionId, bytes32 marketId, address owner, uint256 exposureBaseUnits, uint64 openedAt) external;
}

interface IYeltraDividendDemoSetupAccounting {
    struct PositionState {
        bytes32 marketId;
        address owner;
        uint256 exposureBaseUnits;
        uint256 lastIndex;
        uint256 accruedBaseUnits;
        uint64 openedAt;
        bool enabled;
        bool closed;
    }
    function markets(bytes32 marketId) external view returns (uint256 index, uint8 exposureDecimals, uint8 rewardDecimals, bool enabled);
    function getPosition(bytes32 positionId) external view returns (PositionState memory);
}

/// @notice Configures one isolated, synthetic NVDA-labelled development position on Testnet.
contract SetupYeltraDividendDemoTestnet {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    uint256 private constant FIXED_EXPOSURE = 2 ether;
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 private constant CONFIRMATION_HASH = keccak256("YELTRA_DIVIDEND_DEMO_SETUP_46630");
    bytes32 public constant MARKET_ID = keccak256("YELTRA-DEVELOPMENT-NVDA-46630");
    bytes32 public constant POSITION_DOMAIN = keccak256("YELTRA_DIVIDEND_DEMO_POSITION_V1");
    address private constant DEFAULT_ACCESS_MANAGER = 0x3aaB079e0017aF37C15C7aB11e319995cf426097;
    struct SetupConfig {
        uint256 privateKey;
        address demoWallet;
        address tokenAddress;
        address registryAddress;
        address accessManager;
    }
    VmSetupYeltraDividendDemo private constant vm =
        VmSetupYeltraDividendDemo(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error MissingPrivateKey();
    error InvalidConfiguration();
    error DeployerMissingOperator(address deployer);
    error ExistingMarketMismatch();
    error ExistingPositionMismatch();
    error InvalidTokenSupply();

    event DividendDemoPositionPrepared(bytes32 indexed marketId, bytes32 indexed positionId, address indexed owner, address token, uint256 exposure);

    function run() external returns (bytes32 marketId, bytes32 positionId) {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        string memory confirmation = vm.envString("YELTRA_DIVIDEND_DEMO_SETUP_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        uint256 privateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (privateKey == 0) revert MissingPrivateKey();
        address deployer = vm.addr(privateKey);
        address demoWallet = vm.envOr("YELTRA_DIVIDEND_DEMO_WALLET_TESTNET", address(0));
        address tokenAddress = vm.envOr("YELTRA_DIVIDEND_DEMO_TOKEN_TESTNET", address(0));
        address registryAddress = vm.envOr("NEXT_PUBLIC_YELTRA_DIVIDEND_REGISTRY_TESTNET", address(0));
        address accessManager = vm.envOr("YELTRA_DIVIDEND_ACCESS_MANAGER", DEFAULT_ACCESS_MANAGER);
        if (
            demoWallet == address(0) || tokenAddress.code.length == 0 || registryAddress.code.length == 0
                || accessManager.code.length == 0
        ) revert InvalidConfiguration();
        if (!IYeltraDividendDemoSetupAuthority(accessManager).hasRole(OPERATOR_ROLE, deployer)) {
            revert DeployerMissingOperator(deployer);
        }

        return _setup(SetupConfig(privateKey, demoWallet, tokenAddress, registryAddress, accessManager));
    }

    function _setup(SetupConfig memory config)
        private
        returns (bytes32 marketId, bytes32 positionId)
    {
        YeltraDividendDemoYieldToken token = YeltraDividendDemoYieldToken(config.tokenAddress);
        if (
            !token.developmentOnly() || token.designatedWallet() != config.demoWallet
                || address(token.accessManager()) != config.accessManager
        ) revert InvalidConfiguration();

        IYeltraDividendDemoSetupRegistry registry = IYeltraDividendDemoSetupRegistry(config.registryAddress);
        address accountingAddress = registry.accounting();
        if (accountingAddress.code.length == 0) revert InvalidConfiguration();
        marketId = MARKET_ID;
        positionId = keccak256(abi.encode(POSITION_DOMAIN, block.chainid, config.demoWallet, config.tokenAddress));
        IYeltraDividendDemoSetupAccounting accounting = IYeltraDividendDemoSetupAccounting(accountingAddress);
        bool isNewMarket = _needsMarketConfiguration(registry, accounting, config.tokenAddress, marketId);
        bool isNewMint = _needsMint(token, config.demoWallet);
        bool isNewPosition = _needsPositionRegistration(accounting, positionId, marketId, config.demoWallet);

        vm.startBroadcast(config.privateKey);
        if (isNewMarket) registry.configureMarket(marketId, config.tokenAddress, config.tokenAddress, 18, 6, 0);
        if (isNewMint) token.mintDevelopmentPosition();
        if (isNewPosition) {
            registry.registerPosition(positionId, marketId, config.demoWallet, FIXED_EXPOSURE, uint64(block.timestamp));
        }
        vm.stopBroadcast();

        emit DividendDemoPositionPrepared(marketId, positionId, config.demoWallet, config.tokenAddress, FIXED_EXPOSURE);
    }

    function _needsMarketConfiguration(
        IYeltraDividendDemoSetupRegistry registry,
        IYeltraDividendDemoSetupAccounting accounting,
        address tokenAddress,
        bytes32 marketId
    ) private view returns (bool isNewMarket) {
        IYeltraDividendDemoSetupRegistry.MarketConfig memory market = registry.getMarket(marketId);
        (uint256 index, uint8 exposureDecimals, uint8 rewardDecimals, bool enabled) = accounting.markets(marketId);
        isNewMarket = market.underlying == address(0);
        if (isNewMarket) {
            if (
                market.sourceAdapter != address(0) || enabled || index != 0
                    || exposureDecimals != 0 || rewardDecimals != 0
            ) revert ExistingMarketMismatch();
        } else if (
            market.underlying != tokenAddress || market.sourceAdapter != tokenAddress
                || market.protocolFeeBps != 0 || !market.enabled || market.paused
                || exposureDecimals != 18 || rewardDecimals != 6 || !enabled
        ) revert ExistingMarketMismatch();
    }

    function _needsMint(YeltraDividendDemoYieldToken token, address demoWallet)
        private
        view
        returns (bool isNewMint)
    {
        isNewMint = !token.developmentPositionMinted();
        uint256 expectedSupply = isNewMint ? 0 : FIXED_EXPOSURE;
        if (token.totalSupply() != expectedSupply) revert InvalidTokenSupply();
        if (!isNewMint && token.balanceOf(demoWallet) != FIXED_EXPOSURE) revert InvalidTokenSupply();
    }

    function _needsPositionRegistration(
        IYeltraDividendDemoSetupAccounting accounting,
        bytes32 positionId,
        bytes32 marketId,
        address demoWallet
    ) private view returns (bool isNewPosition) {
        IYeltraDividendDemoSetupAccounting.PositionState memory position = accounting.getPosition(positionId);
        isNewPosition = position.owner == address(0);
        if (!isNewPosition && (
            position.owner != demoWallet || position.marketId != marketId
                || position.exposureBaseUnits != FIXED_EXPOSURE || position.closed
        )) revert ExistingPositionMismatch();
    }
}
