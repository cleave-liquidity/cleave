// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraAccessManager} from "../src/YeltraAccessManager.sol";
import {YeltraDividendLens} from "../src/YeltraDividendLens.sol";
import {YeltraDividendRegistry} from "../src/YeltraDividendRegistry.sol";
import {YeltraDividendAccounting} from "../src/YeltraDividendAccounting.sol";

interface VmYeltraDividendMainnet {
    function envAddress(string calldata name) external returns (address value);
    function envString(string calldata name) external returns (string memory value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

interface IYeltraDividendMainnetAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

interface IYeltraDividendMainnetSafe {
    function getThreshold() external view returns (uint256);
    function getOwners() external view returns (address[] memory);
}

/// @title DeployYeltraDividendMainnet
/// @notice Deploys the empty Dividend Earn infrastructure on Robinhood Chain Mainnet.
/// @dev No markets, positions, dividend events, or settlement are configured by this script.
contract DeployYeltraDividendMainnet {
    uint256 public constant MAINNET_CHAIN_ID = 4663;
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");
    bytes32 private constant GUARDIAN_ROLE = keccak256("CLEAVE_GUARDIAN");
    bytes32 private constant CONFIRMATION_HASH =
        keccak256("YELTRA_DIVIDEND_MAINNET_DEPLOY_4663");
    bytes32 private constant NVDA_CANONICAL_ID = keccak256(
        abi.encode(uint256(4663), keccak256("PENDLE"), address(0x206a5cD00E9FfaBb8CA564076B64799A78DF19b9))
    );
    bytes32 private constant SGOV_CANONICAL_ID = keccak256(
        abi.encode(uint256(4663), keccak256("PENDLE"), address(0xd6E26E957B3207a5C618213d928647Ec84150cA0))
    );
    bytes32 private constant NVDA_LEGACY_ID = bytes32("NVDA-TRADING-YIELD");

    VmYeltraDividendMainnet private constant vm = VmYeltraDividendMainnet(
        address(uint160(uint256(keccak256("hevm cheat code"))))
    );

    error WrongChain(uint256 actualChainId);
    error MissingMainnetConfirmation();
    error InvalidAdminSafe(address adminSafe);
    error InvalidSafeThreshold(uint256 threshold, uint256 ownerCount);
    error DeploymentInvariantFailed(bytes32 invariant);

    event YeltraDividendMainnetDeployed(
        address indexed registry,
        address indexed accounting,
        address indexed lens,
        address accessManager,
        address adminSafe,
        uint256 chainId,
        uint256 topLevelDeploymentTransactions
    );

    function validateDeploymentInputs(address adminSafe, string calldata confirmation)
        external
        view
        returns (address)
    {
        return _validateDeploymentInputs(adminSafe, confirmation);
    }

    function run()
        external
        returns (
            YeltraAccessManager accessManager,
            YeltraDividendRegistry registry,
            YeltraDividendAccounting accounting,
            YeltraDividendLens lens
        )
    {
        address adminSafe = _validateDeploymentInputs(
            vm.envAddress("YELTRA_DIVIDEND_MAINNET_ADMIN_SAFE"),
            vm.envString("YELTRA_DIVIDEND_MAINNET_CONFIRMATION")
        );

        // A fresh authority is required because the existing Mainnet authority was
        // controlled by an exposed deployment key. The Safe receives every role.
        vm.startBroadcast();
        accessManager = new YeltraAccessManager(adminSafe);
        registry = new YeltraDividendRegistry(address(accessManager));
        accounting = registry.accounting(); // Created internally by the Registry constructor.
        lens = new YeltraDividendLens(address(registry));

        _assertDeployment(accessManager, registry, accounting, lens, adminSafe);
        vm.stopBroadcast();

        emit YeltraDividendMainnetDeployed(
            address(registry),
            address(accounting),
            address(lens),
            address(accessManager),
            adminSafe,
            block.chainid,
            3
        );
    }

    function _validateDeploymentInputs(address adminSafe, string memory confirmation)
        internal
        view
        returns (address validatedAdminSafe)
    {
        if (block.chainid != MAINNET_CHAIN_ID) revert WrongChain(block.chainid);
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) {
            revert MissingMainnetConfirmation();
        }
        if (adminSafe == address(0) || adminSafe.code.length == 0) {
            revert InvalidAdminSafe(adminSafe);
        }

        try IYeltraDividendMainnetSafe(adminSafe).getThreshold() returns (uint256 threshold) {
            try IYeltraDividendMainnetSafe(adminSafe).getOwners() returns (address[] memory owners) {
                if (threshold < 2 || threshold > owners.length) {
                    revert InvalidSafeThreshold(threshold, owners.length);
                }
                for (uint256 i = 0; i < owners.length; i++) {
                    if (owners[i] == address(0)) revert InvalidAdminSafe(adminSafe);
                    for (uint256 j = i + 1; j < owners.length; j++) {
                        if (owners[i] == owners[j]) revert InvalidAdminSafe(adminSafe);
                    }
                }
            } catch {
                revert InvalidAdminSafe(adminSafe);
            }
        } catch {
            revert InvalidAdminSafe(adminSafe);
        }
        return adminSafe;
    }

    function _assertDeployment(
        YeltraAccessManager accessManager,
        YeltraDividendRegistry registry,
        YeltraDividendAccounting accounting,
        YeltraDividendLens lens,
        address adminSafe
    ) internal view {
        if (
            address(accessManager).code.length == 0 || address(registry).code.length == 0
                || address(accounting).code.length == 0 || address(lens).code.length == 0
        ) revert DeploymentInvariantFailed("BYTECODE");

        IYeltraDividendMainnetAccess authority = IYeltraDividendMainnetAccess(address(accessManager));
        if (
            !authority.hasRole(ADMIN_ROLE, adminSafe) || !authority.hasRole(OPERATOR_ROLE, adminSafe)
                || !authority.hasRole(GUARDIAN_ROLE, adminSafe)
        ) revert DeploymentInvariantFailed("SAFE_ROLES");

        if (
            address(registry.accessManager()) != address(accessManager)
                || address(registry.accounting()) != address(accounting)
                || address(accounting.accessManager()) != address(accessManager)
                || accounting.registry() != address(registry)
                || address(lens.registry()) != address(registry)
                || address(lens.accounting()) != address(accounting)
        ) revert DeploymentInvariantFailed("WIRING");

        if (accounting.settlementEnabled()) revert DeploymentInvariantFailed("SETTLEMENT");

        // Check the canonical NVDA / SGOV keys and prior ticker keys explicitly.
        // The Registry is freshly created and this script never calls configureMarket.
        _assertMarketEmpty(registry, NVDA_CANONICAL_ID);
        _assertMarketEmpty(registry, SGOV_CANONICAL_ID);
        _assertMarketEmpty(registry, NVDA_LEGACY_ID);
    }

    function _assertMarketEmpty(YeltraDividendRegistry registry, bytes32 marketId) private view {
        YeltraDividendRegistry.MarketConfig memory market = registry.getMarket(marketId);
        if (market.underlying != address(0) || market.enabled || market.paused) {
            revert DeploymentInvariantFailed("MARKET_NOT_EMPTY");
        }
    }
}
