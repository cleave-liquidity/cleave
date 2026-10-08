// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraOptionsCollateralVault} from "../src/YeltraOptionsCollateralVault.sol";
import {YeltraTestnetDevelopmentCollateral} from "../src/YeltraTestnetDevelopmentCollateral.sol";

interface VmYeltraRateOptionsFundingTestnet {
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envString(string calldata name) external returns (string memory value);
    function addr(uint256 privateKey) external returns (address account);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

interface IYeltraRateOptionsFundingAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title FundYeltraRateOptionsDevelopmentTestnet
/// @notice Guarded minting and vault-funding workflow for one authorized demo wallet.
/// @dev This script is chain-gated to 46630 and never deploys or funds Mainnet.
contract FundYeltraRateOptionsDevelopmentTestnet {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant CONFIRMATION_HASH =
        keccak256("YELTRA_RATE_OPTIONS_FUND_DEVELOPMENT_TESTNET_46630");
    VmYeltraRateOptionsFundingTestnet private constant vm =
        VmYeltraRateOptionsFundingTestnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error MissingPrivateKey();
    error InvalidConfiguration();
    error DeployerMissingAdminRole(address deployer);
    error NotDevelopmentCollateral();

    function run() external {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        string memory confirmation = vm.envString("YELTRA_RATE_OPTIONS_FUND_DEVELOPMENT_TESTNET_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        uint256 privateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (privateKey == 0) revert MissingPrivateKey();
        address deployer = vm.addr(privateKey);
        address accessManager = vm.envOr(
            "YELTRA_OPTIONS_ACCESS_MANAGER_TESTNET",
            address(0x3aaB079e0017aF37C15C7aB11e319995cf426097)
        );
        address collateralTokenAddress = vm.envOr("YELTRA_OPTIONS_COLLATERAL_TOKEN_TESTNET", address(0));
        address collateralVaultAddress = vm.envOr("YELTRA_OPTIONS_COLLATERAL_VAULT_TESTNET", address(0));
        address demoWallet = vm.envOr("YELTRA_OPTIONS_DEMO_WALLET_TESTNET", address(0));
        uint256 demoMintAmount = vm.envOr("YELTRA_OPTIONS_DEMO_MINT_AMOUNT_TESTNET", uint256(0));
        uint256 vaultFundingAmount = vm.envOr("YELTRA_OPTIONS_VAULT_FUNDING_AMOUNT_TESTNET", uint256(0));
        if (
            accessManager == address(0)
                || collateralTokenAddress.code.length == 0
                || collateralVaultAddress.code.length == 0
                || demoWallet == address(0)
                || demoMintAmount == 0
                || vaultFundingAmount == 0
        ) revert InvalidConfiguration();

        IYeltraRateOptionsFundingAccess authority = IYeltraRateOptionsFundingAccess(accessManager);
        if (!authority.hasRole(ADMIN_ROLE, deployer)) revert DeployerMissingAdminRole(deployer);

        YeltraTestnetDevelopmentCollateral collateral =
            YeltraTestnetDevelopmentCollateral(collateralTokenAddress);
        YeltraOptionsCollateralVault vault = YeltraOptionsCollateralVault(collateralVaultAddress);
        if (
            !collateral.DEVELOPMENT_ONLY()
                || address(collateral.accessManager()) != accessManager
                || vault.collateralToken() != collateralTokenAddress
        ) {
            revert NotDevelopmentCollateral();
        }

        vm.startBroadcast(privateKey);
        collateral.mint(demoWallet, demoMintAmount);
        collateral.mint(deployer, vaultFundingAmount);
        collateral.approve(collateralVaultAddress, vaultFundingAmount);
        vault.deposit(vaultFundingAmount);
        vm.stopBroadcast();
    }
}
