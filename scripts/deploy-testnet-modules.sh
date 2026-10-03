#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
contracts_dir="$repo_dir/contracts"

read_env_value() {
  awk -F= -v key="$1" '$1 == key {sub(/^[^=]*=/, ""); gsub(/^"|"$/, ""); print; exit}' "$repo_dir/.env.local"
}

if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" && -f "$repo_dir/.env.local" ]]; then
  export DEPLOYER_PRIVATE_KEY="$(read_env_value DEPLOYER_PRIVATE_KEY)"
fi
if [[ -z "${ROBINHOOD_TESTNET_RPC_URL:-}" && -f "$repo_dir/.env.local" ]]; then
  export ROBINHOOD_TESTNET_RPC_URL="$(read_env_value ROBINHOOD_TESTNET_RPC_URL)"
fi

: "${ROBINHOOD_TESTNET_RPC_URL:?ROBINHOOD_TESTNET_RPC_URL is required}"
: "${DEPLOYER_PRIVATE_KEY:?DEPLOYER_PRIVATE_KEY is required}"

if [[ ! "$DEPLOYER_PRIVATE_KEY" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  printf 'Refusing deployment: DEPLOYER_PRIVATE_KEY is not a valid 32-byte key.\n' >&2
  exit 1
fi

chain_id="$(cast chain-id --rpc-url "$ROBINHOOD_TESTNET_RPC_URL")"
if [[ "$chain_id" != "46630" ]]; then
  printf 'Refusing deployment: expected Robinhood Chain Testnet 46630, got %s.\n' "$chain_id" >&2
  exit 1
fi

deployer="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
balance_wei="$(cast balance "$deployer" --rpc-url "$ROBINHOOD_TESTNET_RPC_URL")"
printf 'Network: Robinhood Chain Testnet (46630)\nDeployer: %s\nBalance: %s wei\n' "$deployer" "$balance_wei"
if [[ "$balance_wei" == "0" ]]; then
  printf 'Refusing deployment: the deployer needs Testnet ETH for gas.\n' >&2
  exit 1
fi

forge_args=(
  script "$contracts_dir/script/DeployTestnetModules.s.sol:DeployTestnetModules"
  --root "$contracts_dir"
  --rpc-url "$ROBINHOOD_TESTNET_RPC_URL"
  --private-key "$DEPLOYER_PRIVATE_KEY"
  -vvv
)

if [[ "${DEPLOY_BROADCAST_TESTNET:-0}" == "1" ]]; then
  printf 'Broadcast: enabled for Testnet modules only.\n'
  forge "${forge_args[@]}" --broadcast
else
  printf 'Broadcast: disabled (dry run). Set DEPLOY_BROADCAST_TESTNET=1 to broadcast.\n'
  forge "${forge_args[@]}"
fi
