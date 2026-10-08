# YELTRA Yield Rate Options · Testnet Development MVP

This package is an isolated development layer. It is not a Mainnet oracle,
production pricing model, or production settlement system.

## Rate units

`YeltraRateIndex` stores an annualized yield rate with `1e18` scale:

- `50_000_000_000_000_000` = 5%
- rates are bounded to `0..1e18`
- only the shared YELTRA admin/operator roles may publish observations
- observations must be strictly increasing and cannot be future-dated
- the options market rejects stale observations
- settlement additionally requires the latest observation timestamp to be at
  or after the option expiry

The current repository has no verified external Testnet rate feed or Testnet
Steakhouse USDG deployment. Until one exists, this source must remain labeled
`TESTNET DEVELOPMENT RATE INDEX`.

## Quote model

The deterministic development quote is:

```text
distance = abs(currentRate - strike)
basePremium = notional × 100 / 10,000
distancePremium = (notional × distance / 1e18) × 2,500 / 10,000
premium = max(1, basePremium + distancePremium)
```

The payoff is linear and capped:

```text
CALL payoff = min(notional, notional × max(settlementRate - strike, 0) / 1e18)
PUT payoff  = min(notional, notional × max(strike - settlementRate, 0) / 1e18)
```

The collateral vault locks the full notional before an option is opened. A
settled payout is reserved in the vault and can only be claimed once by the
option owner. No payout is available without funded collateral.

## Collateral boundary

The repository audit checked the configured/Mainnet USDG and Steakhouse vault
addresses against Robinhood Chain Testnet `46630`. They have no Testnet
bytecode and are not valid Options collateral on that network. No other
verified Testnet collateral address is configured in the repository.

The isolated development path therefore uses:

- `YeltraTestnetDevelopmentCollateral`
- symbol `yDEVUSD`
- 6 decimals
- `DEVELOPMENT_ONLY = true`
- admin-only minting through the existing Testnet Access Manager

`yDEVUSD` is simulated Testnet collateral. It is not USDG, USDC, or a claim
on production funds. The token constructor and deployment script are both
chain-gated to `46630`.

## Deployment boundary

The guarded deployment requires:

- Robinhood Chain Testnet chain ID `46630`
- the existing Testnet Access Manager
- `YELTRA_RATE_OPTIONS_DEVELOPMENT_TESTNET_CONFIRMATION=YELTRA_RATE_OPTIONS_DEVELOPMENT_TESTNET_46630`
- an explicitly supplied initial development rate

The development deployment command is:

```bash
bun run options:deploy:development:testnet
```

It deploys only `yDEVUSD`, `YeltraRateIndex`,
`YeltraOptionsCollateralVault`, and `YeltraRateOptionsMarket`. It does not
modify the existing Options, Dividend, Pendle, or Mainnet deployments.

After the deployment output is reviewed, set the returned token and vault
addresses plus an explicitly authorized wallet and raw 6-decimal amounts, then
run the separately guarded funding command:

```bash
bun run options:fund:development:testnet
```

This mints only to the named demo wallet and deployer, deposits only the
specified vault funding amount, and requires the yDEVUSD marker and vault-token
match before any broadcast can begin.

No collateral token or Options contract address is currently configured in
this repository. Therefore no Options transaction has been sent and the
frontend keeps the market unavailable until real addresses are added.
