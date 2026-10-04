#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
contracts_dir="$repo_dir/contracts"

read_env_value() {
  awk -F= -v key="$1" '$1 == key {sub(/^[^=]*=/, ""); gsub(/^"|"$/, ""); print; exit}' "$repo_dir/.env.local"
}

if [[ -z "${MAINNET_DEPLOYER_PRIVATE_KEY:-}" && -f "$repo_dir/.env.local" ]]; then
  export MAINNET_DEPLOYER_PRIVATE_KEY="$(read_env_value MAINNET_DEPLOYER_PRIVATE_KEY)"
fi
if [[ -z "${ROBINHOOD_MAINNET_RPC_URL:-}" && -f "$repo_dir/.env.local" ]]; then
  export ROBINHOOD_MAINNET_RPC_URL="$(read_env_value ROBINHOOD_MAINNET_RPC_URL)"
fi
if [[ -z "${PENDLE_MAINNET_ROUTER:-}" && -f "$repo_dir/.env.local" ]]; then
  export PENDLE_MAINNET_ROUTER="$(read_env_value PENDLE_MAINNET_ROUTER)"
fi
if [[ -z "${PENDLE_MAINNET_ADAPTER_ID:-}" && -f "$repo_dir/.env.local" ]]; then
  export PENDLE_MAINNET_ADAPTER_ID="$(read_env_value PENDLE_MAINNET_ADAPTER_ID)"
fi

: "${ROBINHOOD_MAINNET_RPC_URL:?ROBINHOOD_MAINNET_RPC_URL is required}"
: "${MAINNET_DEPLOYER_PRIVATE_KEY:?MAINNET_DEPLOYER_PRIVATE_KEY is required}"
: "${CLEAVE_MAINNET_CONFIRMATION:?Set CLEAVE_MAINNET_CONFIRMATION=CLEAVE_MAINNET_DEPLOY_4663 explicitly}"

if [[ "$CLEAVE_MAINNET_CONFIRMATION" != "CLEAVE_MAINNET_DEPLOY_4663" ]]; then
  printf 'Refusing deployment: explicit Mainnet confirmation is invalid.\n' >&2
  exit 1
fi
if [[ ! "$MAINNET_DEPLOYER_PRIVATE_KEY" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  printf 'Refusing deployment: MAINNET_DEPLOYER_PRIVATE_KEY is not a valid 32-byte key.\n' >&2
  exit 1
fi

chain_id="$(cast chain-id --rpc-url "$ROBINHOOD_MAINNET_RPC_URL")"
if [[ "$chain_id" != "4663" ]]; then
  printf 'Refusing Mainnet deployment: expected chain 4663, got %s.\n' "$chain_id" >&2
  exit 1
fi

deployer="$(cast wallet address --private-key "$MAINNET_DEPLOYER_PRIVATE_KEY")"
balance_wei="$(cast balance "$deployer" --rpc-url "$ROBINHOOD_MAINNET_RPC_URL")"
printf 'Network: Robinhood Chain Mainnet (4663)\nDeployer: %s\nBalance: %s wei\n' "$deployer" "$balance_wei"
if [[ "$balance_wei" == "0" ]]; then
  printf 'Refusing deployment: the Mainnet deployer needs ETH for gas.\n' >&2
  exit 1
fi

forge_args=(
  script "$contracts_dir/script/DeployMainnet.s.sol:DeployMainnet"
  --root "$contracts_dir"
  --rpc-url "$ROBINHOOD_MAINNET_RPC_URL"
  --private-key "$MAINNET_DEPLOYER_PRIVATE_KEY"
  -vvv
)

if [[ "${DEPLOY_BROADCAST_MAINNET:-0}" == "1" ]]; then
  printf 'Broadcast: enabled only because the exact Mainnet confirmation was provided.\n'
  forge "${forge_args[@]}" --broadcast
else
  printf 'Broadcast: disabled (Mainnet preparation simulation). Set DEPLOY_BROADCAST_MAINNET=1 only after explicit human review.\n'
  forge "${forge_args[@]}"
fi
