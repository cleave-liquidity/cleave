# YELTRA Market Directory

`YeltraNativeMarketRegistry` is intentionally not reused for external markets. Its schema assumes YELTRA-owned PT/YT/source-adapter contracts and its factory-only registration boundary is not a generic provider directory.

`YeltraMarketDirectory` stores only provider-neutral identity:

- market ID
- provider ID
- market type
- market address
- underlying asset
- chain ID
- enabled state
- registration timestamp

Morpho vault accounting, APY availability, liquidity semantics, and execution support remain in `MorphoYieldMarketAdapter`. No PT/YT/SY values are invented for a vault market.

The current repository does not contain a deployed directory address. Configure `YELTRA_MARKET_DIRECTORY` only after the directory is deployed and verified. Until then:

```text
bun market:show --mainnet
bun market:validate --mainnet
bun market:register --mainnet
```

are read-only and report `DIRECTORY ADDRESS REQUIRED`; they do not fabricate a registration hash or explorer link.

Registration broadcast requires both `--broadcast` and the exact confirmation:

```text
YELTRA_MARKET_MAINNET_REGISTER_4663
```
