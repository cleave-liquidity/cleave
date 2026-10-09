// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {YeltraOptionsCollateralVault} from "../src/YeltraOptionsCollateralVault.sol";
import {YeltraRateIndex} from "../src/YeltraRateIndex.sol";
import {YeltraRateOptionsMarket} from "../src/YeltraRateOptionsMarket.sol";
import {YeltraTestnetDevelopmentCollateral} from "../src/YeltraTestnetDevelopmentCollateral.sol";

interface VmYeltraRateOptionsFundingTestnet {
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256 value);
    function envString(string calldata name) external returns (string memory value);
    function startBroadcast(address account) external;
    function stopBroadcast() external;
}

interface IYeltraRateOptionsFundingAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title FundYeltraRateOptionsDevelopmentTestnet
/// @notice Exact-minimum minting and vault-funding workflow for an authorized demo.
/// @dev Testnet-only. The operator signs with a Ledger/account; no raw key is read.
contract FundYeltraRateOptionsDevelopmentTestnet {
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    uint256 private constant BPS = 10_000;
    uint256 private constant MAX_RATE_DISTANCE_PREMIUM_BPS = 2_500;
    uint256 private constant BASE_PREMIUM_BPS = 100;
    uint256 private constant MAX_POSITION_SCAN = 1_000;
    address private constant EXPOSED_HISTORICAL_ADMIN = 0x1e1AD136fb877aB473834E869407C7ae59fCFe8B;
    bytes32 private constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    bytes32 private constant CONFIRMATION_HASH =
        keccak256("YELTRA_RATE_OPTIONS_FUND_DEVELOPMENT_TESTNET_46630");
    VmYeltraRateOptionsFundingTestnet private constant vm =
        VmYeltraRateOptionsFundingTestnet(address(uint160(uint256(keccak256("hevm cheat code")))));

    struct FundingConfig {
        address fundingAdmin;
        address collateralToken;
        address collateralVault;
        address rateIndex;
        address market;
        address demoWallet;
        uint256 callNotional;
        uint256 putNotional;
    }

    struct Contracts {
        YeltraTestnetDevelopmentCollateral token;
        YeltraOptionsCollateralVault vault;
        YeltraRateIndex index;
        YeltraRateOptionsMarket market;
        address accessManager;
    }

    struct FundingAmounts {
        uint256 existingLiabilities;
        uint256 requiredVaultDeposit;
        uint256 maximumPremiumBudget;
        uint256 requiredDemoMint;
    }

    error WrongChain(uint256 actualChainId);
    error MissingConfirmation();
    error InvalidConfiguration();
    error FundingAccountMissingAdminRole(address fundingAccount);
    error ExposedHistoricalAdminForbidden();
    error AccessManagerMismatch(address configured, address actual);
    error NotDevelopmentCollateral();
    error PositionObligationsMismatch();
    error PositionScanLimitExceeded(uint256 nextOptionId);

    event DevelopmentFundingPlan(
        address indexed fundingAdmin,
        address indexed demoWallet,
        uint256 callNotional,
        uint256 putNotional,
        uint256 existingLiabilities,
        uint256 requiredVaultDeposit,
        uint256 maximumPremiumBudget,
        uint256 requiredDemoMint
    );

    function run() external {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        string memory confirmation = vm.envString("YELTRA_RATE_OPTIONS_FUND_DEVELOPMENT_TESTNET_CONFIRMATION");
        if (keccak256(bytes(confirmation)) != CONFIRMATION_HASH) revert MissingConfirmation();

        FundingConfig memory config = _readConfig();
        Contracts memory deployed = _loadContracts(config);
        _validateRolesAndWiring(config, deployed);
        FundingAmounts memory amounts = _calculateFunding(config, deployed);

        emit DevelopmentFundingPlan(
            config.fundingAdmin,
            config.demoWallet,
            config.callNotional,
            config.putNotional,
            amounts.existingLiabilities,
            amounts.requiredVaultDeposit,
            amounts.maximumPremiumBudget,
            amounts.requiredDemoMint
        );

        _broadcastFunding(config, deployed, amounts);
    }

    function _readConfig() private returns (FundingConfig memory config) {
        config.fundingAdmin = vm.envOr("YELTRA_OPTIONS_FUNDING_ADMIN_TESTNET", address(0));
        config.collateralToken = vm.envOr("NEXT_PUBLIC_YELTRA_OPTIONS_COLLATERAL_TOKEN_TESTNET", address(0));
        config.collateralVault = vm.envOr("NEXT_PUBLIC_YELTRA_OPTIONS_COLLATERAL_VAULT_TESTNET", address(0));
        config.rateIndex = vm.envOr("NEXT_PUBLIC_YELTRA_OPTIONS_RATE_INDEX_TESTNET", address(0));
        config.market = vm.envOr("NEXT_PUBLIC_YELTRA_OPTIONS_MARKET_TESTNET", address(0));
        config.demoWallet = vm.envOr("YELTRA_OPTIONS_DEMO_WALLET_TESTNET", address(0));
        config.callNotional = vm.envOr("YELTRA_OPTIONS_CALL_NOTIONAL_TESTNET", uint256(0));
        config.putNotional = vm.envOr("YELTRA_OPTIONS_PUT_NOTIONAL_TESTNET", uint256(0));
        if (
            config.fundingAdmin == address(0)
                || config.collateralToken.code.length == 0
                || config.collateralVault.code.length == 0
                || config.rateIndex.code.length == 0
                || config.market.code.length == 0
                || config.demoWallet == address(0)
                || config.callNotional == 0
                || config.putNotional == 0
        ) revert InvalidConfiguration();
        if (config.fundingAdmin == EXPOSED_HISTORICAL_ADMIN) revert ExposedHistoricalAdminForbidden();
    }

    function _loadContracts(FundingConfig memory config) private view returns (Contracts memory deployed) {
        deployed.token = YeltraTestnetDevelopmentCollateral(config.collateralToken);
        deployed.vault = YeltraOptionsCollateralVault(config.collateralVault);
        deployed.index = YeltraRateIndex(config.rateIndex);
        deployed.market = YeltraRateOptionsMarket(config.market);
        deployed.accessManager = address(deployed.token.accessManager());
    }

    function _validateRolesAndWiring(FundingConfig memory config, Contracts memory deployed) private {
        IYeltraRateOptionsFundingAccess authority = IYeltraRateOptionsFundingAccess(deployed.accessManager);
        address configuredManager = vm.envOr("YELTRA_OPTIONS_ACCESS_MANAGER_TESTNET", address(0));
        if (configuredManager == address(0) || configuredManager != deployed.accessManager) {
            revert AccessManagerMismatch(configuredManager, deployed.accessManager);
        }
        if (!authority.hasRole(ADMIN_ROLE, config.fundingAdmin)) {
            revert FundingAccountMissingAdminRole(config.fundingAdmin);
        }
        if (
            !deployed.token.DEVELOPMENT_ONLY()
                || address(deployed.vault.accessManager()) != deployed.accessManager
                || address(deployed.index.accessManager()) != deployed.accessManager
                || deployed.vault.collateralToken() != config.collateralToken
                || deployed.vault.market() != config.market
                || address(deployed.market.rateIndex()) != config.rateIndex
                || address(deployed.market.collateralVault()) != config.collateralVault
                || deployed.market.collateralToken() != config.collateralToken
                || deployed.token.decimals() != 6
        ) revert NotDevelopmentCollateral();
    }

    function _calculateFunding(FundingConfig memory config, Contracts memory deployed)
        private
        view
        returns (FundingAmounts memory amounts)
    {
        amounts.existingLiabilities = deployed.vault.lockedCollateral() + deployed.vault.reservedPayout();
        _validatePositionObligations(deployed);
        uint256 requiredBalance = amounts.existingLiabilities + config.callNotional + config.putNotional;
        uint256 currentBalance = deployed.vault.totalBalance();
        amounts.requiredVaultDeposit = requiredBalance > currentBalance ? requiredBalance - currentBalance : 0;

        amounts.maximumPremiumBudget = _maxPremium(config.callNotional) + _maxPremium(config.putNotional);
        uint256 currentDemoBalance = deployed.token.balanceOf(config.demoWallet);
        amounts.requiredDemoMint = amounts.maximumPremiumBudget > currentDemoBalance
            ? amounts.maximumPremiumBudget - currentDemoBalance
            : 0;
    }

    function _validatePositionObligations(Contracts memory deployed) private view {
        uint256 nextOptionId = deployed.market.nextOptionId();
        if (nextOptionId > MAX_POSITION_SCAN + 1) revert PositionScanLimitExceeded(nextOptionId);

        uint256 openNotional;
        uint256 unsettledPayout;
        for (uint256 optionId = 1; optionId < nextOptionId; optionId++) {
            (
                address owner,
                ,
                YeltraRateOptionsMarket.OptionState state,
                ,
                ,
                uint256 notional,
                ,
                ,
                uint256 payout,

            ) = deployed.market.options(optionId);
            if (owner == address(0)) continue;
            if (state == YeltraRateOptionsMarket.OptionState.OPEN) openNotional += notional;
            else if (state == YeltraRateOptionsMarket.OptionState.SETTLED) unsettledPayout += payout;
        }

        if (
            openNotional != deployed.vault.lockedCollateral()
                || unsettledPayout != deployed.vault.reservedPayout()
        ) revert PositionObligationsMismatch();
    }

    function _broadcastFunding(
        FundingConfig memory config,
        Contracts memory deployed,
        FundingAmounts memory amounts
    ) private {
        if (amounts.requiredDemoMint == 0 && amounts.requiredVaultDeposit == 0) return;
        vm.startBroadcast(config.fundingAdmin);
        if (amounts.requiredDemoMint > 0) deployed.token.mint(config.demoWallet, amounts.requiredDemoMint);
        if (amounts.requiredVaultDeposit > 0) {
            deployed.token.mint(config.fundingAdmin, amounts.requiredVaultDeposit);
            deployed.token.approve(config.collateralVault, amounts.requiredVaultDeposit);
            deployed.vault.deposit(amounts.requiredVaultDeposit);
        }
        vm.stopBroadcast();
    }

    function _maxPremium(uint256 notional) private pure returns (uint256) {
        uint256 rateDistanceBps = BASE_PREMIUM_BPS + MAX_RATE_DISTANCE_PREMIUM_BPS;
        uint256 quotient = notional / BPS;
        uint256 remainder = notional % BPS;
        return quotient * rateDistanceBps + (remainder * rateDistanceBps + BPS - 1) / BPS;
    }
}
