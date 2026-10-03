#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
contracts_dir="$repo_dir/contracts"

: "${ROBINHOOD_TESTNET_RPC_URL:?ROBINHOOD_TESTNET_RPC_URL is required}"
: "${DEPLOYER_PRIVATE_KEY:?DEPLOYER_PRIVATE_KEY is required}"

chain_id="$(cast chain-id --rpc-url "$ROBINHOOD_TESTNET_RPC_URL")"
if [[ "$chain_id" != "46630" ]]; then
  printf 'Refusing deployment: expected Robinhood Chain Testnet 46630, got %s.\n' "$chain_id" >&2
  exit 1
fi

deployer="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
balance_wei="$(cast balance "$deployer" --rpc-url "$ROBINHOOD_TESTNET_RPC_URL")"
printf 'Network: Robinhood Chain Testnet (46630)\n'
printf 'Deployer: %s\n' "$deployer"
printf 'Balance: %s wei\n' "$balance_wei"

if [[ "$balance_wei" == "0" ]]; then
  printf 'Refusing deployment: the deployer needs Testnet ETH for gas.\n' >&2
  exit 1
fi

forge_args=(
  script "$contracts_dir/script/Deploy.s.sol:Deploy"
  --root "$contracts_dir"
  --rpc-url "$ROBINHOOD_TESTNET_RPC_URL"
  --private-key "$DEPLOYER_PRIVATE_KEY"
  -vvv
)

if [[ "${DEPLOY_BROADCAST_TESTNET:-0}" == "1" ]]; then
  printf 'Broadcast: enabled for Robinhood Chain Testnet only.\n'
  forge "${forge_args[@]}" --broadcast
else
  printf 'Broadcast: disabled (dry run). Set DEPLOY_BROADCAST_TESTNET=1 to broadcast on Testnet.\n'
  forge "${forge_args[@]}"
fi
