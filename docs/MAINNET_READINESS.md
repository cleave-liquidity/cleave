# CLEAVE Mainnet Readiness

## Current state

- Network: Robinhood Chain Mainnet, chain ID `4663`.
- RPC: supplied only through `NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL`.
- Data mode: mock by default; live mode is an explicit configuration choice.
- The deployment manifest and verified token registry currently contain zero entries.
- No production contract writes are enabled.

## Mainnet gate

Mainnet is **not ready for user funds**. The live adapter remains a typed boundary and throws `live-integration-not-configured` until the deployment, ABI, security, and operational checks below are signed off.

- Independent contract and protocol review completed.
- Addresses verified against the intended chain and published sources.
- Token decimals and accounting units verified from contract reads.
- Quote, slippage, maturity, paused, liquidity, and settlement behavior tested.
- Exact approval amounts, spender restrictions, replay/idempotency handling, and receipt finality tested.
- RPC/provider failure, wallet rejection, wrong-network, and reverted-transaction recovery tested.
- Monitoring, incident response, admin/pause ownership, and rollback procedures documented.
- A funded but capped canary has completed successfully before wider release.
