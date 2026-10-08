#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
contracts_dir="$repo_dir/contracts"

: "${YELTRA_RATE_OPTIONS_TESTNET_CONFIRMATION:?Set YELTRA_RATE_OPTIONS_TESTNET_CONFIRMATION=YELTRA_RATE_OPTIONS_TESTNET_46630 only after reviewing the deployment inputs.}"
: "${DEPLOYER_PRIVATE_KEY:?Set DEPLOYER_PRIVATE_KEY in a private local environment.}"
: "${YELTRA_OPTIONS_COLLATERAL_TOKEN_TESTNET:?Set a verified Testnet collateral-token address; this script will not invent one.}"
: "${YELTRA_OPTIONS_INITIAL_RATE_TESTNET:?Set the explicitly labeled Testnet development rate in 1e18 units.}"

rpc_url="${ROBINHOOD_TESTNET_RPC_URL:-${NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL:-}}"
if [[ -z "$rpc_url" ]]; then
  echo "Missing Robinhood Chain Testnet RPC URL." >&2
  exit 1
fi

chain_id="$(cast chain-id --rpc-url "$rpc_url")"
if [[ "$chain_id" != "46630" ]]; then
  echo "Refusing Options deployment: expected Robinhood Chain Testnet 46630, got $chain_id." >&2
  exit 1
fi

deployer="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
balance_wei="$(cast balance "$deployer" --rpc-url "$rpc_url")"

printf '%s\n' \
  "Network: Robinhood Chain Testnet (46630)" \
  "Deployer: $deployer" \
  "Balance: $balance_wei wei" \
  "Collateral token: $YELTRA_OPTIONS_COLLATERAL_TOKEN_TESTNET" \
  "Initial rate: $YELTRA_OPTIONS_INITIAL_RATE_TESTNET (1e18 scale)" \
  "Expected deployment: Rate Index + Collateral Vault + Options Market"

cd "$contracts_dir"
forge build
forge script script/DeployYeltraRateOptionsTestnet.s.sol:DeployYeltraRateOptionsTestnet \
  --rpc-url "$rpc_url" \
  --broadcast \
  -vvvv
