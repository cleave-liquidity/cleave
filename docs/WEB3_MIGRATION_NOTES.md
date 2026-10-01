# Web3 migration notes

The current MVP deliberately keeps quote, valuation, and balance calculations in JavaScript numbers so the demo can run without production contracts. Before wiring the contract adapter, migrate the following boundaries to exact on-chain representations:

- Use `bigint` for token amounts, fees, allowances, quote outputs, and transaction values. Convert through token decimals only at the UI boundary.
- Replace APY percentages and time-based valuation formulas with protocol-defined fixed-point units and the protocol's exact maturity/epoch rules.
- Recompute quotes and minimum-output/deadline checks inside the contract-facing adapter. Never submit UI-only floating-point values as trusted execution parameters.
- Read balances, allowances, gas estimates, and transaction receipts through viem/wagmi, and distinguish user rejection, reverted execution, and unavailable RPC errors.
- Replace deterministic mock transaction hashes and localStorage positions with receipt-backed position reads. Keep wallet ownership checks in the adapter/domain boundary.

The mock adapter remains intentionally isolated behind `YieldMarketAdapter`; these changes should not require rewriting the TradePanel or portfolio action hooks.
