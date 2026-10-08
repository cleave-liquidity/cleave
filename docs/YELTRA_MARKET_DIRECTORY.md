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

The Mainnet directory is deployed at `0x9CA476Fa631273EB5Db83186115bDF3ABaccc951` and is configured through `YELTRA_MARKET_DIRECTORY` and `NEXT_PUBLIC_YELTRA_MARKET_DIRECTORY`. Its deployment transaction is `0xae15647aa3503d73a6f14161ca3555acec629c4579f7a0a508ade06a7320d6f6`. Source verification remains a separate Blockscout status and is not marked verified locally.

```text
bun market:show --mainnet
bun market:validate --mainnet
bun market:register --mainnet
```

are read-only for `show` and `validate`, while `register` requires the guarded broadcast command below. They read the live Directory entry and do not fabricate a registration hash or explorer link.

Registration broadcast requires both `--broadcast` and the exact confirmation:

```text
YELTRA_MARKET_MAINNET_REGISTER_4663
```
