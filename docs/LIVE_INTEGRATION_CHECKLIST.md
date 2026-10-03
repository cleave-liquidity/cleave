# Live Integration Checklist

This checklist covers the verified live Pendle adapter used by normal Mainnet browsing. Mock mode remains an explicit development option only.

## Configuration and provenance

- [ ] Set `NEXT_PUBLIC_CLEAVE_DATA_MODE=live` in the production environment; use `mock` only for explicit development testing.
- [ ] Configure the matching RPC URL and `NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV`.
- [ ] Register only verified token metadata for chain `4663` or `46630`.
- [ ] Register only verified contract deployments in `lib/contracts/deployments.ts`.
- [ ] Every market response includes `sourceProtocol`, `yieldSource`, `chainId`, `dataMode`, underlying/quote assets, and maturity.
- [ ] Optional market/PT/YT/vault addresses are populated only from the verified manifest.

## Reads and quotes

- [ ] Implement market discovery and single-market reads against the real protocol.
- [ ] Implement native ETH and ERC-20 balance reads with bigint raw units and contract-reported decimals.
- [ ] Implement allowance reads for the exact token, owner, spender, and chain.
- [ ] Replace mock quote math with protocol/router quotes and preserve `quoteId`, timestamp, expiry, block number, and source.
- [ ] Reject expired, mismatched, paused, matured, illiquid, or otherwise non-tradable quotes.

## Writes and receipts

- [ ] Approve only the exact required amount; never use an infinite approval.
- [ ] Validate wallet ownership, chain ID, amount bounds, and spender before writing.
- [ ] Model approval and trade as separate transaction steps where required.
- [ ] Wait for receipts and classify submitted, pending, confirmed, and reverted states.
- [ ] Parse events/returned amounts from receipts rather than assuming mock arithmetic.
- [ ] Make retries idempotent and never silently replay a user-confirmed write.

## Release verification

- [ ] Test wallet rejection, wrong network, insufficient gas, RPC timeout/rate limit, revert, and dropped transaction paths.
- [ ] Confirm cache/query invalidation is scoped to wallet and chain.
- [ ] Confirm wallet and network changes cannot display data from the previous account/network.
- [ ] Run `bun test`, `bun run typecheck`, `bun run lint`, and `bun run build`.
- [ ] Verify valid market routes remain `200` and unknown market IDs use the App Router `notFound()` path.
- [ ] Complete funded human-wallet canary and security sign-off before treating mainnet writes as production-ready.
