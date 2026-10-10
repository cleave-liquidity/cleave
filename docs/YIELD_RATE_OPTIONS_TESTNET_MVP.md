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

This is a deterministic demonstration formula, not a fair-value model: it
does not use a volatility surface, probability distribution, term structure,
or market-maker quote. It must not be used to sell options for real economic
value.

The payoff is linear and capped:

```text
CALL payoff = min(notional, notional × max(settlementRate - strike, 0) / 1e18)
PUT payoff  = min(notional, notional × max(strike - settlementRate, 0) / 1e18)
```

The collateral vault locks the full notional before an option is opened. A
settled payout is reserved in the vault and can only be claimed once by the
option owner. No payout is available without funded collateral.

## Testnet product terms and enforcement boundary

The website offers one 30-day expiry and a three-point development strike
ladder: the index rate rounded to the nearest 0.5 percentage point, plus the
center and strikes one percentage point below/above it, clipped to 0–100%.
Breakeven is derived from the quoted premium and the contract's linear payoff
using conservative integer rounding.

These term limits are a frontend market configuration only. The current
`YeltraRateOptionsMarket` implementation accepts any strike in 0–100% and any
expiry up to 365 days through direct contract calls. Therefore this is not a
production restriction; enforcing the ladder and exact tenor requires a new
Testnet market deployment and explicit wallet/broadcast approval.

## Source and settlement boundary

The present Testnet index is admin/operator-published. It is not derived from
the Steakhouse USDG vault, a verified external rate feed, or a reproducible
30-day realized-yield calculation. The contract settles from the latest fresh
observation timestamped at/after expiry, not from a cryptographically
committed time-weighted observation series. This is only suitable for the
isolated Testnet demonstration.

A production oracle is blocked until YELTRA approves a specific source and
methodology: source contract, observation cadence, realized-rate formula,
window boundaries, outlier handling, signer/quorum model, and dispute/fallback
policy. A vault share-price history alone does not establish a market-wide
realized APY or settlement price.

## Collateral boundary

The repository audit checked the Mainnet USDG and Steakhouse vault addresses
against Robinhood Chain Testnet `46630`. They are not valid Options collateral
on that network. No verified production collateral is available on Testnet.

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

The existing deployment remains untouched. The local Foundry keystore named
`yeltra-options-testnet-admin` was not recognized by `cast wallet list` in the
current environment, and the supplied administrator value is still a
placeholder. Do not broadcast the original deployment command, which uses the
historical AccessManager and raw-key flow. For a fresh isolated stack, first
make the named encrypted account valid and supply its matching public address
in `YELTRA_OPTIONS_FRESH_ADMIN_TESTNET`. The deployment wrapper uses that named
keystore and will not accept the historical admin.

The fresh stack is a new `YeltraAccessManager`, yDEVUSD token, Rate Index,
Collateral Vault, and Options Market followed by `setMarket` (six transactions
on broadcast). The contracts are wired to the new AccessManager; the new admin
is the only initial role holder. Existing Options addresses remain unchanged
until a successful fresh deployment and explicit local configuration update.

Run the guarded deployment in simulation first. It does not broadcast unless
`--broadcast` is passed:

```bash
bun run options:deploy:fresh-admin:testnet
```

This dry-run requires a working Testnet RPC, the real public admin address, an
explicit development-rate input, the exact confirmation string, and a keystore
that Foundry enumerates. It prints actual simulation gas estimates; no gas
requirement is claimed before that succeeds. After any approved deployment,
copy only confirmed addresses and the AccessManager deployment block into the
local public configuration, then run the read-only preflight:

```bash
bun run options:testnet:preflight
```

The preflight validates configured addresses by bytecode and cross-contract
wiring rather than a hardcoded historical address list. It reads current role
state; the known exposed historical admin is labeled and rejected by write
tooling. Use only the explicitly configured fresh YELTRA admin, never a JEVO
account by assumption.

The original deployed Testnet addresses remain in `.env.example` as historical
public configuration until a fresh deployment is actually confirmed. Run the
read-only preflight before choosing any signer or funding amount:

```bash
bun run options:testnet:preflight
```

The preflight checks bytecode, chain ID, wiring, current Admin/Operator role
events and role state, rate freshness, wallet balance/allowance, outstanding
positions, vault accounting, and read-only gas estimates. It must pass before a
wallet signs any state-changing operation.

The rate index is intentionally operator-published development input. A
publisher must be a current `CLEAVE_ADMIN` or `CLEAVE_OPERATOR`; configure the
fresh admin address and use only the matching `yeltra-options-testnet-admin`
encrypted keystore. To publish an explicitly chosen development value, set
`YELTRA_OPTIONS_UPDATED_RATE_TESTNET` in raw `1e18` units and use the guarded
command below only after separately approving that exact value:

```bash
bun run options:rate:publish:development:testnet
```

This command is chain-gated to 46630, checks the actual index AccessManager and
role, requires the exact confirmation string, validates the keystore’s public
address metadata, and signs with Foundry `--account`. Foundry prompts locally
for the encrypted-keystore password; never put it in a shell command or env
file. The published value is not external oracle data and must remain labeled
as development-only.

For a small two-sided demonstration, explicitly choose both notionals in raw
6-decimal yDEVUSD units, for example `1000000` for one yDEVUSD each. The
preflight computes:

```text
existing liabilities = lockedCollateral + reservedPayout
worst-case new payout = Call notional + Put notional
minimum vault deposit = max(0, existing liabilities + worst-case new payout - vault balance)
maximum premium buffer = ceil(26% × Call notional) + ceil(26% × Put notional)
minimum wallet mint = max(0, maximum premium buffer - demo wallet yDEVUSD balance)
```

The 26% bound is the current formula's 1% base plus at most 25% rate-distance
component. Premium receipts are excluded from collateral coverage. For one
yDEVUSD Call and one yDEVUSD Put with zero existing obligations and an empty
vault, this means at most 2.000000 yDEVUSD vault backing and a 0.520000 yDEVUSD
wallet premium buffer. The exact on-chain quote is still fetched again by the
website at purchase time. These are simulated Testnet tokens, not USDG or
production funds.

After confirming the preflight values, use the fresh admin address tied to the
`yeltra-options-testnet-admin` encrypted Foundry account. Foundry unlocks that
keystore interactively when broadcasting; never pass a password or key through
an argument or environment variable. Set the demo wallet and both raw notionals,
then use the separately guarded funding command:

```bash
bun run options:fund:development:testnet
```

The script recomputes the exact required mint/deposit from live balances and
obligations, rejects mismatched contract addresses or wiring, mints only the
minimum premium shortfall to the named demo wallet, and deposits only the
minimum vault amount. It validates the configured manager and live wiring, then
uses the named encrypted Foundry account; no raw key or keystore password is
read by the scripts or printed.

The original Options deployment broadcast shows sender
`0x1e1ad136fb877ab473834e869407c7ae59fcfe8b`; the Testnet AccessManager
constructor initially granted that deployment admin all three managed roles.
This is historical evidence, not current-role proof. The deployment key must
not be reused if exposed; use a different secure account only if live
`hasRole` confirms that it is already authorized. No script grants roles.

The status/preflight commands are read-only. If a rate snapshot is stale,
publish only an explicitly chosen development value, then run preflight again.
The existing contracts require a fresh observation at or after option expiry
before settlement; for a 30-day series, update the development index after
expiry and settle promptly within `maxStaleness`. Local Foundry time-warp tests
cover settlement and claim without waiting on-chain. The contract supports
shorter expiries through direct calls, but the website intentionally remains
on its 30-day tenor; do not present a shortened direct-call position as the
website market.

The Foundry broadcast records a successful deployment receipt beginning at
block `131091904`. In the current execution environment, the live status and
preflight RPC reads still fail despite the RPC variable being configured;
bytecode, current roles, rate, funding, receipts, and gas estimates therefore
remain unverified here. Do not infer them from local broadcast metadata. No
deployment, rate update, mint, funding, or option transaction was sent during
this implementation task.
