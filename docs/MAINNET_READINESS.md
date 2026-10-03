# CLEAVE Mainnet Readiness

## Current state

- Network: Robinhood Chain Mainnet, chain ID `4663`.
- RPC: supplied only through `NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL`.
- Data mode: live by default; mock mode is explicit development configuration.
- Pendle live market discovery and verified token metadata are enabled through the live adapter.
- Verified external Pendle router/factory deployments are listed in the contract registry.
- Production writes are implemented, but still require the human-wallet canary below.

## Mainnet gate

Mainnet is **not yet signed off for unrestricted user funds**. The live adapter has typed market, quote, approval, transaction, receipt, and portfolio boundaries; the operational and human-wallet checks below remain release gates.

- Independent contract and protocol review completed.
- Addresses verified against the intended chain and published sources.
- Token decimals and accounting units verified from contract reads.
- Quote, slippage, maturity, paused, liquidity, and settlement behavior tested.
- Exact approval amounts, spender restrictions, replay/idempotency handling, and receipt finality tested.
- RPC/provider failure, wallet rejection, wrong-network, and reverted-transaction recovery tested.
- Monitoring, incident response, admin/pause ownership, and rollback procedures documented.
- A funded but capped canary has completed successfully before wider release.
