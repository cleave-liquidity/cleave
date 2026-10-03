# CLEAVE-owned contract deployment

## Contract purpose

`CleaveRegistry` is a small CLEAVE-owned configuration anchor for approved external Pendle router and market references. It provides an auditable project-owned address without changing the existing Pendle quote or transaction path.

It does not custody user funds, execute trades, mint PT/YT, act as an AMM, or use upgradeability or delegate calls. The current application continues to approve and transact with the external Pendle Router V2 from live Mainnet market metadata.

## Foundry layout

- `contracts/src/CleaveRegistry.sol` — contract source
- `contracts/test/CleaveRegistry.t.sol` — unit tests
- `contracts/script/Deploy.s.sol` — Testnet-only deployment script
- `contracts/broadcast/` — real Foundry broadcast metadata; intentionally not ignored
- `lib/contracts/project-deployments.ts` — synchronized runtime registry generated from confirmed broadcasts

The Testnet deployment script refuses every chain except Robinhood Chain Testnet `46630`. Mainnet uses a separate guarded script and is not broadcast by this workflow.

## Testnet deployment

Set these values in the local ignored environment only. Never commit or paste the private key:

```bash
export ROBINHOOD_TESTNET_RPC_URL="<Robinhood Chain Testnet RPC>"
export DEPLOYER_PRIVATE_KEY="<local secret>"
```

The deployer must have Testnet ETH. The helper checks the RPC chain ID and prints only the public deployer address and balance:

```bash
bun deploy:testnet
```

That command defaults to a simulation. After reviewing the simulation, the explicit Testnet broadcast is:

```bash
DEPLOY_BROADCAST_TESTNET=1 bun deploy:testnet
```

After a confirmed broadcast, synchronize the exact contract address, transaction hash, block, deployer, and gas metadata into the application registry:

```bash
bun contracts:sync
bun deploy:show
```

The registry marks the contract `DEPLOYED / NOT VERIFIED` by default. After the explorer returns a successful verification result, synchronize the verified status explicitly:

```bash
DEPLOYMENT_VERIFIED=1 bun contracts:sync
```

No placeholder address is accepted by the sync script.

## Testnet verification

After deployment, verify the exact address against the deployed constructor argument (the public deployer address):

```bash
export DEPLOYER_ADDRESS="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"

forge verify-contract --root contracts \
  --chain 46630 \
  --verifier blockscout \
  --verifier-url https://explorer.testnet.chain.robinhood.com/api \
  --constructor-args "$(cast abi-encode 'constructor(address)' "$DEPLOYER_ADDRESS")" \
  --watch \
  <TESTNET_CONTRACT_ADDRESS> src/CleaveRegistry.sol:CleaveRegistry
```

Use the explorer’s current verification API URL if its endpoint differs. Do not report `VERIFIED` until the explorer or verifier returns a successful result.

## Exact Mainnet next step

There is no Mainnet deployment in this repository and this turn does not broadcast one. Before any Mainnet action, review the source and deployment simulation, create a separate Mainnet-only script guarded for chain `4663`, set `ROBINHOOD_MAINNET_RPC_URL`, fund the deployer with Mainnet ETH, confirm the chain ID, and obtain an explicit human approval for the broadcast. Then verify the resulting address and synchronize only the confirmed Mainnet broadcast metadata.

Do not reuse the Testnet broadcast flag or copy a Testnet address to Mainnet. No gas threshold is fabricated; use the simulation and the actual deployer balance to decide whether the transaction is fundable.

## Expanded module architecture

The existing `CleaveRegistry` deployment was preserved. The seven additional modules are small, non-custodial contracts deployed around it:

| Module | Responsibility | Testnet status |
| --- | --- | --- |
| `CleaveAccessManager` | Admin, operator, and guardian roles | Verified |
| `CleaveRegistry` | Existing top-level configuration anchor | Verified; not redeployed |
| `CleaveAdapterRegistry` | Approved external adapter metadata | Verified |
| `CleaveMarketRegistry` | Verified external market metadata | Verified; zero Testnet markets registered |
| `CleaveRiskGuard` | Global, market, and adapter pause state | Verified |
| `CleaveExecutionRouter` | Validated execution boundary; no arbitrary calls | Verified |
| `CleaveLifecycleManager` | Fixed/Trading Yield lifecycle eligibility | Verified |
| `CleaveLens` | Read-only module and market aggregation | Verified |

`CleaveLens` is the discovery/read layer because the already deployed `CleaveRegistry` has no module-registration interface. The current frontend Pendle transaction path remains direct and external; the new execution router does not forward arbitrary calldata or custody funds.

## Real Testnet deployment

The seven-module deployment was broadcast on Robinhood Chain Testnet `46630` using the existing funded deployer. The Testnet script refuses other chain IDs and refuses a repeat broadcast when a confirmed module broadcast already exists.

```bash
bun deploy:testnet                 # simulation
DEPLOY_BROADCAST_TESTNET=1 bun deploy:testnet
bun deploy:show
```

Verification and synchronization are explicit and consume only public Foundry artifacts:

```bash
bun contracts:verify:testnet
DEPLOYMENT_VERIFIED=1 bun contracts:sync
bun deploy:replay
```

`deploy:replay` only reads broadcast receipts and never sends transactions. The synchronized runtime registry contains eight verified Testnet project deployments, while Mainnet remains an empty project deployment set.

## Mainnet preparation

Mainnet has a separate script and separate wrapper:

```bash
bun deploy:mainnet
```

It requires chain `4663`, `ROBINHOOD_MAINNET_RPC_URL`, a funded deployer, and the exact explicit confirmation `CLEAVE_MAINNET_DEPLOY_4663`. It defaults to simulation; broadcasting additionally requires `DEPLOY_BROADCAST_MAINNET=1`. It never reuses Testnet addresses. Deployment order is:

1. `CleaveAccessManager`
2. fresh `CleaveRegistry`
3. `CleaveAdapterRegistry`
4. `CleaveMarketRegistry`
5. `CleaveRiskGuard`
6. `CleaveExecutionRouter`
7. `CleaveLifecycleManager`
8. `CleaveLens`

If `PENDLE_MAINNET_ROUTER` is supplied, the script can prepare the Pendle adapter record. It does not fabricate markets. Current verified live Mainnet market metadata can be prepared with:

```bash
bun contracts:sync-mainnet-markets
```

That command reads the live adapter, emits a registration plan, and never broadcasts or writes a contract transaction. At the time of the last audit it returned seven currently tradable Mainnet markets and the verified Pendle Router V2.
