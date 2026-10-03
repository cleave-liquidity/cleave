// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveAccessManager} from "../src/CleaveAccessManager.sol";
import {CleaveAdapterRegistry} from "../src/CleaveAdapterRegistry.sol";

contract AdapterCaller {
    function register(address registry, bytes32 id, address router) external returns (bool) {
        (bool success,) = registry.call(
            abi.encodeWithSelector(CleaveAdapterRegistry.registerAdapter.selector, id, bytes32("PENDLE"), router, 4663)
        );
        return success;
    }
}

contract CleaveAdapterRegistryTest {
    CleaveAccessManager private accessManager;
    CleaveAdapterRegistry private registry;
    bytes32 private constant ADAPTER_ID = bytes32("PENDLE");
    address private constant ROUTER = address(uint160(0x3001));

    function setUp() public {
        accessManager = new CleaveAccessManager(address(this));
        registry = new CleaveAdapterRegistry(address(accessManager));
    }

    function testRegistersEnabledExternalAdapter() public {
        registry.registerAdapter(ADAPTER_ID, bytes32("PENDLE"), ROUTER, 4663);
        CleaveAdapterRegistry.AdapterConfig memory adapter = registry.getAdapter(ADAPTER_ID);

        assert(adapter.protocolId == bytes32("PENDLE"));
        assert(adapter.router == ROUTER);
        assert(adapter.chainId == 4663);
        assert(adapter.enabled);
        assert(registry.isAdapterEnabled(ADAPTER_ID));
    }

    function testOperatorCanDisableAdapter() public {
        registry.registerAdapter(ADAPTER_ID, bytes32("PENDLE"), ROUTER, 4663);
        registry.setAdapterEnabled(ADAPTER_ID, false);
        assert(!registry.isAdapterEnabled(ADAPTER_ID));
    }

    function testUnauthorizedCallerCannotRegisterAdapter() public {
        AdapterCaller caller = new AdapterCaller();
        assert(!caller.register(address(registry), ADAPTER_ID, ROUTER));
    }
}
