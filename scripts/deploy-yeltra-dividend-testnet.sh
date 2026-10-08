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
: "${YELTRA_DIVIDEND_TESTNET_CONFIRMATION:?Set YELTRA_DIVIDEND_TESTNET_CONFIRMATION explicitly}"

if [[ "$YELTRA_DIVIDEND_TESTNET_CONFIRMATION" != "YELTRA_DIVIDEND_TESTNET_46630" ]]; then
  printf 'Refusing Dividend Testnet deployment: invalid confirmation.\n' >&2
  exit 1
fi
if [[ ! "$DEPLOYER_PRIVATE_KEY" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  printf 'Refusing Dividend Testnet deployment: invalid private-key format.\n' >&2
  exit 1
fi

chain_id="$(cast chain-id --rpc-url "$ROBINHOOD_TESTNET_RPC_URL")"
if [[ "$chain_id" != "46630" ]]; then
  printf 'Refusing Dividend Testnet deployment: expected chain 46630, got %s.\n' "$chain_id" >&2
  exit 1
fi

deployer="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
balance_wei="$(cast balance "$deployer" --rpc-url "$ROBINHOOD_TESTNET_RPC_URL")"
access_manager="${YELTRA_DIVIDEND_ACCESS_MANAGER:-0x3aab079e0017af37c15c7ab11e319995cf426097}"
printf 'Network: Robinhood Chain Testnet (46630)\nDeployer: %s\nBalance: %s wei\nAccessManager: %s\nExpected deployment: Dividend Registry + Accounting + Lens\n' "$deployer" "$balance_wei" "$access_manager"

broadcast_path="$contracts_dir/broadcast/DeployYeltraDividendTestnet.s.sol/46630/run-latest.json"
if [[ "${DEPLOY_BROADCAST_YELTRA_DIVIDEND_TESTNET:-0}" == "1" && -f "$broadcast_path" && "${DEPLOY_ALLOW_REPEAT_YELTRA_DIVIDEND_TESTNET:-0}" != "1" ]]; then
  printf 'Refusing repeat Dividend Testnet deployment: %s already exists.\n' "$broadcast_path" >&2
  exit 1
fi

forge_args=(
  script "$contracts_dir/script/DeployYeltraDividendTestnet.s.sol:DeployYeltraDividendTestnet"
  --root "$contracts_dir"
  --rpc-url "$ROBINHOOD_TESTNET_RPC_URL"
  --private-key "$DEPLOYER_PRIVATE_KEY"
  -vvv
)

if [[ "${DEPLOY_BROADCAST_YELTRA_DIVIDEND_TESTNET:-0}" == "1" ]]; then
  printf 'Broadcast: enabled only with explicit testnet confirmation.\n'
  forge "${forge_args[@]}" --broadcast
else
  printf 'Broadcast: disabled (dry run).\n'
  forge "${forge_args[@]}"
fi
