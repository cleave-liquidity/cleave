// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DeployYeltraDividendMainnet} from "../script/DeployYeltraDividendMainnet.s.sol";
import {YeltraAccessManager} from "../src/YeltraAccessManager.sol";
import {YeltraDividendAccounting} from "../src/YeltraDividendAccounting.sol";
import {YeltraDividendLens} from "../src/YeltraDividendLens.sol";
import {YeltraDividendRegistry} from "../src/YeltraDividendRegistry.sol";

interface VmDeployYeltraDividendMainnetTest {
    function chainId(uint256 newChainId) external;
    function expectRevert(bytes calldata revertData) external;
}

contract MockDividendAdminSafe {
    function getThreshold() external pure returns (uint256) {
        return 2;
    }

    function getOwners() external pure returns (address[] memory owners) {
        owners = new address[](2);
        owners[0] = address(0xA11CE);
        owners[1] = address(0xB0B);
    }
}

contract MockSingleOwnerSafe {
    function getThreshold() external pure returns (uint256) {
        return 1;
    }

    function getOwners() external view returns (address[] memory owners) {
        owners = new address[](1);
        owners[0] = address(this);
    }
}

contract DeployYeltraDividendMainnetTest {
    VmDeployYeltraDividendMainnetTest private constant vm = VmDeployYeltraDividendMainnetTest(
        address(uint160(uint256(keccak256("hevm cheat code"))))
    );

    function testRejectsNonMainnetChain() external {
        vm.chainId(1);
        DeployYeltraDividendMainnet script = new DeployYeltraDividendMainnet();
        vm.expectRevert(
            abi.encodeWithSelector(DeployYeltraDividendMainnet.WrongChain.selector, uint256(1))
        );
        script.validateDeploymentInputs(address(0), "YELTRA_DIVIDEND_MAINNET_DEPLOY_4663");
    }

    function testRejectsMissingDeploymentConfirmation() external {
        vm.chainId(4663);
        DeployYeltraDividendMainnet script = new DeployYeltraDividendMainnet();
        vm.expectRevert(
            abi.encodeWithSelector(DeployYeltraDividendMainnet.MissingMainnetConfirmation.selector)
        );
        script.validateDeploymentInputs(address(1), "");
    }

    function testRejectsZeroOrNonContractAdmin() external {
        vm.chainId(4663);
        DeployYeltraDividendMainnet script = new DeployYeltraDividendMainnet();
        vm.expectRevert(
            abi.encodeWithSelector(
                DeployYeltraDividendMainnet.InvalidAdminSafe.selector,
                address(0)
            )
        );
        script.validateDeploymentInputs(address(0), "YELTRA_DIVIDEND_MAINNET_DEPLOY_4663");
        vm.expectRevert(
            abi.encodeWithSelector(
                DeployYeltraDividendMainnet.InvalidAdminSafe.selector,
                address(1)
            )
        );
        script.validateDeploymentInputs(address(1), "YELTRA_DIVIDEND_MAINNET_DEPLOY_4663");
    }

    function testRejectsSingleSignerSafe() external {
        vm.chainId(4663);
        MockSingleOwnerSafe safe = new MockSingleOwnerSafe();
        DeployYeltraDividendMainnet script = new DeployYeltraDividendMainnet();
        vm.expectRevert(
            abi.encodeWithSelector(
                DeployYeltraDividendMainnet.InvalidSafeThreshold.selector,
                uint256(1),
                uint256(1)
            )
        );
        script.validateDeploymentInputs(address(safe), "YELTRA_DIVIDEND_MAINNET_DEPLOY_4663");
    }

    function testAcceptsExplicitThresholdSafeOnMainnet() external {
        vm.chainId(4663);
        MockDividendAdminSafe safe = new MockDividendAdminSafe();
        DeployYeltraDividendMainnet script = new DeployYeltraDividendMainnet();

        require(
            script.validateDeploymentInputs(address(safe), "YELTRA_DIVIDEND_MAINNET_DEPLOY_4663")
                == address(safe),
            "validated safe"
        );
    }

    function testFreshDeploymentGraphIsEmptyAndSettlementDisabled() external {
        MockDividendAdminSafe safe = new MockDividendAdminSafe();
        YeltraAccessManager access = new YeltraAccessManager(address(safe));
        YeltraDividendRegistry registry = new YeltraDividendRegistry(address(access));
        YeltraDividendAccounting accounting = registry.accounting();
        YeltraDividendLens lens = new YeltraDividendLens(address(registry));
        bytes32 nvdaId = keccak256(abi.encode(uint256(4663), keccak256("PENDLE"), address(0x1111)));
        bytes32 sgovId = keccak256(abi.encode(uint256(4663), keccak256("PENDLE"), address(0x2222)));
        YeltraDividendRegistry.MarketConfig memory nvda = registry.getMarket(nvdaId);
        YeltraDividendRegistry.MarketConfig memory sgov = registry.getMarket(sgovId);

        require(access.hasRole(keccak256("CLEAVE_ADMIN"), address(safe)), "safe admin");
        require(access.hasRole(keccak256("CLEAVE_OPERATOR"), address(safe)), "safe operator");
        require(access.hasRole(keccak256("CLEAVE_GUARDIAN"), address(safe)), "safe guardian");
        require(address(registry.accessManager()) == address(access), "registry authority");
        require(address(registry.accounting()) == address(accounting), "registry accounting");
        require(accounting.registry() == address(registry), "accounting registry");
        require(address(lens.registry()) == address(registry), "lens registry");
        require(address(lens.accounting()) == address(accounting), "lens accounting");
        require(nvda.underlying == address(0) && !nvda.enabled, "NVDA empty");
        require(sgov.underlying == address(0) && !sgov.enabled, "SGOV empty");
        require(!accounting.settlementEnabled(), "settlement disabled");
    }
}
