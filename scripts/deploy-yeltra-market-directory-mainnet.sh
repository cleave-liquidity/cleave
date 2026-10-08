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

: "${ROBINHOOD_MAINNET_RPC_URL:?ROBINHOOD_MAINNET_RPC_URL is required}"
: "${MAINNET_DEPLOYER_PRIVATE_KEY:?MAINNET_DEPLOYER_PRIVATE_KEY is required}"
: "${YELTRA_MARKET_DIRECTORY_MAINNET_CONFIRMATION:?Set YELTRA_MARKET_DIRECTORY_MAINNET_CONFIRMATION explicitly}"

if [[ "$YELTRA_MARKET_DIRECTORY_MAINNET_CONFIRMATION" != "YELTRA_MARKET_DIRECTORY_MAINNET_4663" ]]; then
  printf 'Refusing YELTRA Market Directory deployment: invalid confirmation.\n' >&2
  exit 1
fi
if [[ ! "$MAINNET_DEPLOYER_PRIVATE_KEY" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  printf 'Refusing YELTRA Market Directory deployment: invalid private-key format.\n' >&2
  exit 1
fi

chain_id="$(cast chain-id --rpc-url "$ROBINHOOD_MAINNET_RPC_URL")"
if [[ "$chain_id" != "4663" ]]; then
  printf 'Refusing YELTRA Market Directory deployment: expected chain 4663, got %s.\n' "$chain_id" >&2
  exit 1
fi

deployer="$(cast wallet address --private-key "$MAINNET_DEPLOYER_PRIVATE_KEY")"
balance_wei="$(cast balance "$deployer" --rpc-url "$ROBINHOOD_MAINNET_RPC_URL")"
access_manager="${YELTRA_MARKET_DIRECTORY_ACCESS_MANAGER:-0xb12c7112446bfe88d6e82b516f5df90449fa3dc4}"
printf 'Network: Robinhood Chain Mainnet (4663)\nDeployer: %s\nBalance: %s wei\nAccessManager: %s\nExpected deployment: 1 YeltraMarketDirectory\n' "$deployer" "$balance_wei" "$access_manager"

if [[ "$balance_wei" == "0" ]]; then
  printf 'Refusing YELTRA Market Directory deployment: deployer needs ETH for gas.\n' >&2
  exit 1
fi

broadcast_path="$contracts_dir/broadcast/DeployYeltraMarketDirectory.s.sol/4663/run-latest.json"
if [[ "${DEPLOY_BROADCAST_YELTRA_MARKET_DIRECTORY:-0}" == "1" && -f "$broadcast_path" && "${DEPLOY_ALLOW_REPEAT_YELTRA_MARKET_DIRECTORY:-0}" != "1" ]]; then
  printf 'Refusing repeat Directory deployment: %s already exists.\n' "$broadcast_path" >&2
  printf 'Set DEPLOY_ALLOW_REPEAT_YELTRA_MARKET_DIRECTORY=1 only for an intentional replacement.\n' >&2
  exit 1
fi

forge_args=(
  script "$contracts_dir/script/DeployYeltraMarketDirectory.s.sol:DeployYeltraMarketDirectory"
  --root "$contracts_dir"
  --rpc-url "$ROBINHOOD_MAINNET_RPC_URL"
  --private-key "$MAINNET_DEPLOYER_PRIVATE_KEY"
  -vvv
)

if [[ "${DEPLOY_BROADCAST_YELTRA_MARKET_DIRECTORY:-0}" == "1" ]]; then
  printf 'Broadcast: enabled only with the explicit Directory confirmation.\n'
  forge "${forge_args[@]}" --broadcast
else
  printf 'Broadcast: disabled (dry run).\n'
  forge "${forge_args[@]}"
fi
