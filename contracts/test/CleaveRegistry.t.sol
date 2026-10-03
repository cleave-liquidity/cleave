// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveRegistry} from "../src/CleaveRegistry.sol";

contract UnauthorizedCaller {
    function setRouter(address registry, address router) external returns (bool) {
        (bool success,) = registry.call(abi.encodeWithSelector(CleaveRegistry.setPendleRouter.selector, router));
        return success;
    }

    function approveMarket(address registry, address market) external returns (bool) {
        (bool success,) = registry.call(
            abi.encodeWithSelector(CleaveRegistry.setMarketApproval.selector, market, true)
        );
        return success;
    }
}

contract ZeroOwnerFactory {
    function deploy() external returns (address) {
        return address(new CleaveRegistry(address(0)));
    }
}

contract CleaveRegistryTest {
    CleaveRegistry private registry;
    address private constant ROUTER = address(uint160(0xBEEF));
    address private constant MARKET = address(uint160(0xCAFE));

    function setUp() public {
        registry = new CleaveRegistry(address(this));
    }

    function testInitialState() public view {
        assert(registry.owner() == address(this));
        assert(registry.pendleRouter() == address(0));
        assert(!registry.approvedMarkets(MARKET));
    }

    function testOwnerCanConfigureRouterAndMarket() public {
        registry.setPendleRouter(ROUTER);
        registry.setMarketApproval(MARKET, true);

        assert(registry.pendleRouter() == ROUTER);
        assert(registry.approvedMarkets(MARKET));
    }

    function testOwnerCanTransferOwnership() public {
        address newOwner = address(uint160(0x1234));
        registry.transferOwnership(newOwner);

        assert(registry.owner() == newOwner);
    }

    function testNonOwnerCannotConfigureRegistry() public {
        UnauthorizedCaller caller = new UnauthorizedCaller();

        assert(!caller.setRouter(address(registry), ROUTER));
        assert(!caller.approveMarket(address(registry), MARKET));
        assert(registry.pendleRouter() == address(0));
        assert(!registry.approvedMarkets(MARKET));
    }

    function testRejectsZeroOwner() public {
        ZeroOwnerFactory factory = new ZeroOwnerFactory();
        (bool success,) = address(factory).call(abi.encodeWithSelector(ZeroOwnerFactory.deploy.selector));
        assert(!success);
    }

    function testRejectsZeroRouterAndMarket() public {
        bool routerReverted;
        try registry.setPendleRouter(address(0)) {
            routerReverted = false;
        } catch {
            routerReverted = true;
        }

        bool marketReverted;
        try registry.setMarketApproval(address(0), true) {
            marketReverted = false;
        } catch {
            marketReverted = true;
        }

        assert(routerReverted);
        assert(marketReverted);
    }
}
