# YELTRA Native USDG Mainnet Canary Package

This package is prepared for one market only. It has not been broadcast and it
does not change the existing Pendle runtime.

## Fixed canary inputs

| Item | Value |
| --- | --- |
| Chain | Robinhood Chain Mainnet, `4663` |
| Source vault | `0xBeEff033F34C046626B8D0A041844C5d1A5409dd` |
| Underlying | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| Existing access manager | `0xb12c7112446bfe88d6e82b516f5df90449fa3dc4` |
| Existing risk guard | `0x0b40937337dd65bae64c260164e303c6c8184a48` |
| Market id label | `USDG-STEAKHOUSE-YELTRA-CANARY` |

The existing access manager is reused only after the deployment script confirms
that the deployer has the legacy-compatible `CLEAVE_ADMIN` or
`CLEAVE_OPERATOR` role. The existing risk guard is not wired into the native
market contracts; it remains part of the existing compatibility graph and is
not presented as native risk coverage.

## Deployment order

`contracts/script/DeployYeltraNativeMainnet.s.sol` performs this order inside a
single guarded broadcast session:

1. `YeltraNativeMarketRegistry(existingAccessManager)`
2. `YeltraRouter(registry)`
3. `YeltraMarketFactory(existingAccessManager, registry, router)`
4. `registry.setFactory(factory)`
5. `factory.approveSource(steakhouseVault, true)`
6. `factory.createMarket(...)`, which atomically creates and wires
   `YeltraPrincipalToken`, `YeltraYieldToken`, `YeltraMarket`, and
   `YeltraYieldSourceAdapter`, then registers the market.

The script refuses to run unless the chain is `4663`, the source vault reports
the configured USDG asset, maturity is in the future, the deployer has a native
admin/operator role, a private key is present, and
`YELTRA_NATIVE_MAINNET_CONFIRMATION` equals
`YELTRA_NATIVE_MAINNET_CANARY_4663`.

No default `package.json` command invokes this script. A human must explicitly
run the Forge script after reviewing the configuration and confirmation guard.

## Post-deployment validation

Run the read-only validator only after populating the seven deployed native
addresses in `.env.local`:

```sh
bun run contracts:validate:native:mainnet
```

It checks chain ID, bytecode, registry/factory/router wiring, source approval,
market/PT/YT/adapter relationships, vault asset identity, and token
controllers. It sends no transaction.

## Disable / rollback procedure

These contracts are not upgradeable and cannot be deleted after deployment.
Before any user funds are accepted, disable the canary by setting the market
disabled or paused in `YeltraNativeMarketRegistry`, and revoke the source
approval in `YeltraMarketFactory`. Existing deployed addresses remain in the
registry for auditability.

If positions already exist, do not destroy or replace the source adapter. Keep
redemption and claims available while issuance is disabled, and communicate any
source loss or maturity delay. A future replacement market must use a new
market id and maturity; it must not overwrite this market's immutable wiring.

## Product readiness boundary

Native issuance is paired: a deposit creates equal PT and YT against source
shares. The current product's single-sided Fixed Yield and Trading Yield flows
therefore remain blocked for this market until real secondary liquidity exists.
Sell Early is intentionally unavailable. No implied APY or liquidity value is
fabricated by `YeltraNativeMarketAdapter`; it reads native source state and
returns an explicit unavailable value for fields that require market history or
a real PT/YT pool.

Minimum liquidity before product activation:

- PT/USDG or PT/underlying route for fixed-yield entry/exit.
- YT/USDG or YT/underlying route for trading-yield entry/exit.
- A real allowlisted DEX route or pool with quotes, slippage limits, and
  sufficient depth for both sides.
- Deterministic indexing of PT/YT liquidity and prices before exposing implied
  APY or Sell Early.
