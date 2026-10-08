// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface VmProcessYeltraDividendDemo {
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envString(string calldata name) external returns (string memory value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

interface IYeltraDividendDemoEventAuthority {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

interface IYeltraDividendDemoEventRegistry {
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
    function processedEvents(bytes32 eventId) external view returns (bool);
    function processDividend(bytes32 marketId, bytes32 eventId, address underlying, uint256 rateBaseUnits, uint8 rateDecimals, uint64 processedAt, uint64 sequence) external;
}

interface IYeltraDividendDemoEventAccounting {
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
    function getPosition(bytes32 positionId) external view returns (PositionState memory);
}

interface IYeltraDividendDemoEventToken {
    function balanceOf(address account) external view returns (uint256);
    function designatedWallet() external view returns (address);
}

/// @notice Guarded, operator-only simulated reference event; records accounting only, never pays funds.
contract ProcessYeltraDividendDemoEventTestnet {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 private constant CONFIRMATION_HASH = keccak256("YELTRA_DIVIDEND_DEMO_EVENT_46630");
    bytes32 public constant MARKET_ID = keccak256("YELTRA-DEVELOPMENT-NVDA-46630");
    bytes32 public constant POSITION_DOMAIN = keccak256("YELTRA_DIVIDEND_DEMO_POSITION_V1");
    bytes32 private constant EVENT_DOMAIN = keccak256("YELTRA_DIVIDEND_DEMO_EVENT_V1");
    address private constant DEFAULT_ACCESS_MANAGER = 0x3aaB079e0017aF37C15C7aB11e319995cf426097;
    VmProcessYeltraDividendDemo private constant vm =
        VmProcessYeltraDividendDemo(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error MissingPrivateKey();
    error InvalidConfiguration();
    error DeployerMissingOperator(address deployer);
    error PositionNotEnabled();
    error EventAlreadyProcessed(bytes32 eventId);

    event DividendDemoReferenceEventProcessed(bytes32 indexed marketId, bytes32 indexed positionId, bytes32 indexed eventId, uint256 rateBaseUnits, uint8 rateDecimals);

    function run() external returns (bytes32 eventId) {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        string memory confirmation = vm.envString("YELTRA_DIVIDEND_DEMO_EVENT_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        uint256 privateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (privateKey == 0) revert MissingPrivateKey();
        address deployer = vm.addr(privateKey);
        address demoWallet = vm.envOr("YELTRA_DIVIDEND_DEMO_WALLET_TESTNET", address(0));
        address tokenAddress = vm.envOr("YELTRA_DIVIDEND_DEMO_TOKEN_TESTNET", address(0));
        address registryAddress = vm.envOr("NEXT_PUBLIC_YELTRA_DIVIDEND_REGISTRY_TESTNET", address(0));
        address accessManager = vm.envOr("YELTRA_DIVIDEND_ACCESS_MANAGER", DEFAULT_ACCESS_MANAGER);
        if (demoWallet == address(0) || tokenAddress.code.length == 0 || registryAddress.code.length == 0) {
            revert InvalidConfiguration();
        }
        if (!IYeltraDividendDemoEventAuthority(accessManager).hasRole(OPERATOR_ROLE, deployer)) {
            revert DeployerMissingOperator(deployer);
        }

        return _process(privateKey, demoWallet, tokenAddress, registryAddress);
    }

    function _process(uint256 privateKey, address demoWallet, address tokenAddress, address registryAddress)
        private
        returns (bytes32 eventId)
    {
        IYeltraDividendDemoEventRegistry registry = IYeltraDividendDemoEventRegistry(registryAddress);
        (bytes32 positionId, uint64 sequence, uint64 processedAt) =
            _validatePosition(registry, demoWallet, tokenAddress);
        eventId = keccak256(abi.encode(EVENT_DOMAIN, block.chainid, positionId, sequence));
        if (registry.processedEvents(eventId)) revert EventAlreadyProcessed(eventId);

        vm.startBroadcast(privateKey);
        // 0.25 reference units/token × 2 synthetic exposure = 0.500000 accounting units.
        registry.processDividend(MARKET_ID, eventId, tokenAddress, 25, 2, processedAt, sequence);
        vm.stopBroadcast();
        emit DividendDemoReferenceEventProcessed(MARKET_ID, positionId, eventId, 25, 2);
    }

    function _validatePosition(
        IYeltraDividendDemoEventRegistry registry,
        address demoWallet,
        address tokenAddress
    ) private view returns (bytes32 positionId, uint64 sequence, uint64 processedAt) {
        IYeltraDividendDemoEventRegistry.MarketConfig memory market = registry.getMarket(MARKET_ID);
        IYeltraDividendDemoEventToken token = IYeltraDividendDemoEventToken(tokenAddress);
        positionId = keccak256(abi.encode(POSITION_DOMAIN, block.chainid, demoWallet, tokenAddress));
        IYeltraDividendDemoEventAccounting.PositionState memory position =
            IYeltraDividendDemoEventAccounting(registry.accounting()).getPosition(positionId);
        if (
            !market.enabled || market.paused || market.underlying != tokenAddress
                || token.designatedWallet() != demoWallet || token.balanceOf(demoWallet) != position.exposureBaseUnits
                || position.owner != demoWallet || position.marketId != MARKET_ID || !position.enabled || position.closed
                || block.timestamp <= market.lastEventTimestamp
        ) revert PositionNotEnabled();

        if (market.lastSequence != 0) revert EventAlreadyProcessed(market.lastEventId);
        sequence = market.lastSequence + 1;
        processedAt = uint64(block.timestamp);
    }

}
