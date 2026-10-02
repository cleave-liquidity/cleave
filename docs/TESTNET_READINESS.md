# CLEAVE Testnet Readiness

## Current state

- Network: Robinhood Chain Testnet, chain ID `46630`.
- RPC: supplied only through `NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL`.
- Data mode: `NEXT_PUBLIC_CLEAVE_DATA_MODE=mock` by default.
- Mock market data, quote math, positions, and transaction results are available for product-flow testing.
- No verified testnet token metadata or contract deployments are currently registered.

## Ready for

- UI and domain-flow testing with the mock adapter.
- Wallet connection and supported-chain detection through wagmi/RainbowKit.
- Chain-scoped query/cache behavior and typed transaction/error boundaries.
- Integration work against verified token metadata and deployment records once supplied.

## Blocking before live testnet execution

1. Verify token addresses, symbols, names, and decimals for every supported asset.
2. Register verified market/router/PT/YT/vault deployments in `lib/contracts/deployments.ts`.
3. Supply audited ABIs and implement the protocol-specific adapter behind `YieldMarketAdapter`.
4. Connect the on-chain balance and allowance adapters to the verified metadata and spender addresses.
5. Define receipt/event parsing, quote source, expiry, slippage, paused-state, and liquidity rules.
6. Execute wallet, approval, open, claim, sell, and redeem tests against a funded test wallet.

Until these items are complete, live mode intentionally returns `live-integration-not-configured`; it never fabricates a contract write.
