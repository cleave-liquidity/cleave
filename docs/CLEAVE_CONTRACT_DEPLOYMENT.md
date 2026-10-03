# CLEAVE-owned contract deployment

## Contract purpose

`CleaveRegistry` is a small CLEAVE-owned configuration anchor for approved external Pendle router and market references. It provides an auditable project-owned address without changing the existing Pendle quote or transaction path.

It does not custody user funds, execute trades, mint PT/YT, act as an AMM, or use upgradeability or delegate calls. The current application continues to approve and transact with the external Pendle Router V2 from live Mainnet market metadata.

## Foundry layout

- `contracts/src/CleaveRegistry.sol` — contract source
- `contracts/test/CleaveRegistry.t.sol` — unit tests
- `contracts/script/Deploy.s.sol` — Testnet-only deployment script
- `contracts/broadcast/` — real Foundry broadcast metadata; intentionally not ignored
- `lib/contracts/project-deployments.ts` — synchronized runtime registry, empty until a broadcast is synchronized

The deployment script refuses every chain except Robinhood Chain Testnet `46630`. No Mainnet broadcast command is included in this workflow.

## Testnet deployment

Set these values in the local ignored environment only. Never commit or paste the private key:

```bash
export ROBINHOOD_TESTNET_RPC_URL="<Robinhood Chain Testnet RPC>"
export DEPLOYER_PRIVATE_KEY="<local secret>"
```

The deployer must have Testnet ETH. The helper checks the RPC chain ID and prints only the public deployer address and balance:

```bash
bun contracts:deploy:testnet
```

That command defaults to a simulation. After reviewing the simulation, the explicit Testnet broadcast is:

```bash
DEPLOY_BROADCAST_TESTNET=1 bun contracts:deploy:testnet
```

After a confirmed broadcast, synchronize the exact contract address, transaction hash, block, deployer, and gas metadata into the application registry:

```bash
bun contracts:sync
bun deploy:show
```

The registry will mark the contract `DEPLOYED / NOT VERIFIED` until explorer verification succeeds. No placeholder address is accepted by the sync script.

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
