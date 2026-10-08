#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
contracts_dir="$repo_dir/contracts"
source "$repo_dir/scripts/options-terminal.sh"

cinematic=false
for arg in "$@"; do
  [[ "$arg" == "--cinematic" ]] && cinematic=true
done

options_header "$repo_dir" funding "$cinematic"
options_step "Validating network"

: "${YELTRA_RATE_OPTIONS_FUND_DEVELOPMENT_TESTNET_CONFIRMATION:?Set YELTRA_RATE_OPTIONS_FUND_DEVELOPMENT_TESTNET_CONFIRMATION=YELTRA_RATE_OPTIONS_FUND_DEVELOPMENT_TESTNET_46630 only after reviewing the funding inputs.}"
: "${DEPLOYER_PRIVATE_KEY:?Set DEPLOYER_PRIVATE_KEY in a private local environment.}"
: "${YELTRA_OPTIONS_COLLATERAL_TOKEN_TESTNET:?Set the deployed yDEVUSD address.}"
: "${YELTRA_OPTIONS_COLLATERAL_VAULT_TESTNET:?Set the deployed Options collateral vault address.}"
: "${YELTRA_OPTIONS_DEMO_WALLET_TESTNET:?Set the explicitly authorized demo wallet address.}"
: "${YELTRA_OPTIONS_DEMO_MINT_AMOUNT_TESTNET:?Set the demo wallet mint amount in raw 6-decimal units.}"
: "${YELTRA_OPTIONS_VAULT_FUNDING_AMOUNT_TESTNET:?Set the vault funding amount in raw 6-decimal units.}"

rpc_url="${ROBINHOOD_TESTNET_RPC_URL:-${NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL:-}}"
if [[ -z "$rpc_url" ]]; then
  options_status_marker "✕" red; printf ' Missing Robinhood Chain Testnet RPC URL.\n' >&2
  exit 1
fi

chain_id="$(cast chain-id --rpc-url "$rpc_url")"
if [[ "$chain_id" != "46630" ]]; then
  options_status_marker "✕" red; printf ' Refusing funding: expected chain 46630, got %s.\n' "$chain_id" >&2
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

options_step "Reading funding configuration"
options_section "FUNDING INPUTS"
options_line "Network" "Robinhood Chain Testnet · 46630"
options_line "Deployer" "$deployer"
options_line "Balance" "$balance_wei wei"
options_line "Collateral" "$YELTRA_OPTIONS_COLLATERAL_TOKEN_TESTNET · yDEVUSD required"
options_line "Demo wallet" "$YELTRA_OPTIONS_DEMO_WALLET_TESTNET"
options_line "Demo mint" "$YELTRA_OPTIONS_DEMO_MINT_AMOUNT_TESTNET raw units"
options_line "Vault funding" "$YELTRA_OPTIONS_VAULT_FUNDING_AMOUNT_TESTNET raw units"
options_pause 350 "$cinematic"

options_step "Minting authorized demo collateral"

cd "$contracts_dir"
forge build
forge script script/FundYeltraRateOptionsDevelopmentTestnet.s.sol:FundYeltraRateOptionsDevelopmentTestnet \
  --rpc-url "$rpc_url" \
  --broadcast \
  -vvvv

options_step "Confirming transactions"
status_args=()
if [[ "$cinematic" == true ]]; then status_args+=(--cinematic); fi
bun "$repo_dir/scripts/yeltra-options-testnet-status.ts" "${status_args[@]}"
