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
: "${PENDLE_MAINNET_ROUTER:?PENDLE_MAINNET_ROUTER is required}"
: "${PENDLE_MAINNET_ADAPTER_ID:?PENDLE_MAINNET_ADAPTER_ID is required}"
: "${YELTRA_MAINNET_CONFIRMATION:?Set YELTRA_MAINNET_CONFIRMATION=YELTRA_MAINNET_DEPLOY_4663 explicitly}"

if [[ "$YELTRA_MAINNET_CONFIRMATION" != "YELTRA_MAINNET_DEPLOY_4663" ]]; then
  printf 'Refusing YELTRA Mainnet deployment: explicit confirmation is invalid.\n' >&2
  exit 1
fi
if [[ ! "$MAINNET_DEPLOYER_PRIVATE_KEY" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  printf 'Refusing YELTRA Mainnet deployment: invalid private-key format.\n' >&2
  exit 1
fi

chain_id="$(cast chain-id --rpc-url "$ROBINHOOD_MAINNET_RPC_URL")"
if [[ "$chain_id" != "4663" ]]; then
  printf 'Refusing YELTRA Mainnet deployment: expected chain 4663, got %s.\n' "$chain_id" >&2
  exit 1
fi

deployer="$(cast wallet address --private-key "$MAINNET_DEPLOYER_PRIVATE_KEY")"
balance_wei="$(cast balance "$deployer" --rpc-url "$ROBINHOOD_MAINNET_RPC_URL")"
printf 'Network: Robinhood Chain Mainnet (4663)\nDeployer: %s\nBalance: %s wei\n' "$deployer" "$balance_wei"
if [[ "$balance_wei" == "0" ]]; then
  printf 'Refusing YELTRA Mainnet deployment: deployer needs ETH for gas.\n' >&2
  exit 1
fi

broadcast_path="$contracts_dir/broadcast/DeployYeltraMainnet.s.sol/4663/run-latest.json"
if [[ "${DEPLOY_BROADCAST_YELTRA_MAINNET:-0}" == "1" && -f "$broadcast_path" && "${DEPLOY_ALLOW_REPEAT_YELTRA_MAINNET:-0}" != "1" ]]; then
  printf 'Refusing repeat YELTRA Mainnet deployment: %s already exists.\n' "$broadcast_path" >&2
  printf 'Set DEPLOY_ALLOW_REPEAT_YELTRA_MAINNET=1 only for an intentional replacement graph.\n' >&2
  exit 1
fi

forge_args=(
  script "$contracts_dir/script/DeployYeltraMainnet.s.sol:DeployYeltraMainnet"
  --root "$contracts_dir"
  --rpc-url "$ROBINHOOD_MAINNET_RPC_URL"
  --private-key "$MAINNET_DEPLOYER_PRIVATE_KEY"
  -vvv
)

if [[ "${DEPLOY_BROADCAST_YELTRA_MAINNET:-0}" == "1" ]]; then
  printf 'Broadcast: enabled only with the explicit YELTRA Mainnet confirmation.\n'
  forge "${forge_args[@]}" --broadcast
else
  printf 'Broadcast: disabled (dry run). Set DEPLOY_BROADCAST_YELTRA_MAINNET=1 after the Testnet gate passes.\n'
  forge "${forge_args[@]}"
fi
