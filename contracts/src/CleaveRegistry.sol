// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CleaveRegistry
/// @notice A minimal CLEAVE-owned configuration anchor for external Pendle deployments.
/// @dev This contract never holds funds and never executes trades.
contract CleaveRegistry {
    error Unauthorized();
    error ZeroAddress();

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PendleRouterUpdated(address indexed previousRouter, address indexed newRouter);
    event MarketApprovalUpdated(address indexed market, bool approved);

    address public owner;
    address public pendleRouter;
    mapping(address => bool) public approvedMarkets;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setPendleRouter(address newRouter) external onlyOwner {
        if (newRouter == address(0)) revert ZeroAddress();
        address previousRouter = pendleRouter;
        pendleRouter = newRouter;
        emit PendleRouterUpdated(previousRouter, newRouter);
    }

    function setMarketApproval(address market, bool approved) external onlyOwner {
        if (market == address(0)) revert ZeroAddress();
        approvedMarkets[market] = approved;
        emit MarketApprovalUpdated(market, approved);
    }
}
