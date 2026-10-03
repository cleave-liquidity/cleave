// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CleaveMarketRegistry} from "./CleaveMarketRegistry.sol";

/// @title CleaveLifecycleManager
/// @notice Read-only lifecycle eligibility rules for Fixed Yield and Trading Yield positions.
contract CleaveLifecycleManager {
    enum Strategy {
        FixedYield,
        TradingYield
    }

    enum State {
        Unavailable,
        Active,
        Matured,
        Expired
    }

    struct LifecycleStateView {
        State state;
        bool sellEarlyEligible;
        bool redeemAtMaturityEligible;
        bool claimYieldEligible;
        uint256 maturity;
    }

    error ZeroAddress();

    CleaveMarketRegistry public immutable marketRegistry;

    constructor(address marketRegistryAddress) {
        if (marketRegistryAddress == address(0)) revert ZeroAddress();
        marketRegistry = CleaveMarketRegistry(marketRegistryAddress);
    }

    function getLifecycle(bytes32 marketId, Strategy strategy)
        public
        view
        returns (LifecycleStateView memory lifecycle)
    {
        CleaveMarketRegistry.MarketConfig memory marketConfig = marketRegistry.getMarket(marketId);
        lifecycle.maturity = marketConfig.maturity;
        if (!marketConfig.enabled || marketConfig.market == address(0) || marketConfig.maturity == 0) {
            lifecycle.state = State.Unavailable;
            return lifecycle;
        }

        if (block.timestamp < marketConfig.maturity) {
            lifecycle.state = State.Active;
            lifecycle.sellEarlyEligible = true;
            lifecycle.claimYieldEligible = strategy == Strategy.TradingYield;
            return lifecycle;
        }

        if (strategy == Strategy.FixedYield) {
            lifecycle.state = State.Matured;
            lifecycle.redeemAtMaturityEligible = true;
        } else {
            lifecycle.state = State.Expired;
            // This is an eligibility flag only. No claimable amount is fabricated here.
            lifecycle.claimYieldEligible = true;
        }
    }
}
