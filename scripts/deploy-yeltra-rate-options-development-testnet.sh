#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
contracts_dir="$repo_dir/contracts"
source "$repo_dir/scripts/options-terminal.sh"

cinematic=false
for arg in "$@"; do
  [[ "$arg" == "--cinematic" ]] && cinematic=true
done

options_header "$repo_dir" deployment "$cinematic"
options_step "Validating network"

: "${YELTRA_RATE_OPTIONS_DEVELOPMENT_TESTNET_CONFIRMATION:?Set YELTRA_RATE_OPTIONS_DEVELOPMENT_TESTNET_CONFIRMATION=YELTRA_RATE_OPTIONS_DEVELOPMENT_TESTNET_46630 only after reviewing the deployment inputs.}"
: "${DEPLOYER_PRIVATE_KEY:?Set DEPLOYER_PRIVATE_KEY in a private local environment.}"
: "${YELTRA_OPTIONS_INITIAL_RATE_TESTNET:?Set the explicitly labeled Testnet development rate in 1e18 units.}"

rpc_url="${ROBINHOOD_TESTNET_RPC_URL:-${NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL:-}}"
if [[ -z "$rpc_url" ]]; then
  options_status_marker "✕" red; printf ' Missing Robinhood Chain Testnet RPC URL.\n' >&2
  exit 1
fi

chain_id="$(cast chain-id --rpc-url "$rpc_url")"
if [[ "$chain_id" != "46630" ]]; then
  options_status_marker "✕" red; printf ' Refusing deployment: expected chain 46630, got %s.\n' "$chain_id" >&2
  exit 1
fi

options_step "Checking deployer"
deployer="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
balance_wei="$(cast balance "$deployer" --rpc-url "$rpc_url")"

options_step "Verifying admin permissions"
access_manager="${YELTRA_OPTIONS_ACCESS_MANAGER_TESTNET:-0x3aaB079e0017aF37C15C7aB11e319995cf426097}"
admin_role="$(cast keccak 'CLEAVE_ADMIN')"
admin_status="$(cast call "$access_manager" 'hasRole(bytes32,address)(bool)' "$admin_role" "$deployer" --rpc-url "$rpc_url")"
if [[ "$admin_status" != "true" ]]; then
  options_status_marker "!" yellow; printf ' Deployer lacks CLEAVE_ADMIN on the configured Access Manager.\n' >&2
  exit 1
fi

options_step "Reading development configuration"
options_section "DEPLOYMENT INPUTS"
options_line "Network" "Robinhood Chain Testnet · 46630"
options_line "Deployer" "$deployer"
options_line "Balance" "$balance_wei wei"
options_line "Access Manager" "$access_manager"
options_line "Collateral" "yDEVUSD · development only · 6 decimals"
options_line "Initial rate" "$YELTRA_OPTIONS_INITIAL_RATE_TESTNET · 1e18 scale"
options_line "Expected stack" "yDEVUSD + Rate Index + Vault + Market"
options_pause 350 "$cinematic"

options_step "Deploying Options contracts"

cd "$contracts_dir"
forge build
forge script script/DeployYeltraRateOptionsDevelopmentTestnet.s.sol:DeployYeltraRateOptionsDevelopmentTestnet \
  --rpc-url "$rpc_url" \
  --broadcast \
  -vvvv

options_step "Confirming transactions"
status_args=()
if [[ "$cinematic" == true ]]; then status_args+=(--cinematic); fi
bun "$repo_dir/scripts/yeltra-options-testnet-status.ts" "${status_args[@]}"
