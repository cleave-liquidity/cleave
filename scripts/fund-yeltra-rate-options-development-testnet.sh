#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
contracts_dir="$repo_dir/contracts"
source "$repo_dir/scripts/options-terminal.sh"
options_load_local_env "$repo_dir" \
  ROBINHOOD_TESTNET_RPC_URL NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL \
  YELTRA_RATE_OPTIONS_FUND_DEVELOPMENT_TESTNET_CONFIRMATION YELTRA_OPTIONS_FUNDING_ADMIN_TESTNET \
  YELTRA_OPTIONS_DEPLOYMENT_KEYSTORE_TESTNET YELTRA_OPTIONS_DEPLOYMENT_KEYSTORE_PATH_TESTNET \
  YELTRA_OPTIONS_ACCESS_MANAGER_TESTNET YELTRA_OPTIONS_DEMO_WALLET_TESTNET \
  YELTRA_OPTIONS_CALL_NOTIONAL_TESTNET YELTRA_OPTIONS_PUT_NOTIONAL_TESTNET \
  NEXT_PUBLIC_YELTRA_OPTIONS_COLLATERAL_TOKEN_TESTNET NEXT_PUBLIC_YELTRA_OPTIONS_COLLATERAL_VAULT_TESTNET \
  NEXT_PUBLIC_YELTRA_OPTIONS_RATE_INDEX_TESTNET NEXT_PUBLIC_YELTRA_OPTIONS_MARKET_TESTNET

cinematic=false
for arg in "$@"; do
  [[ "$arg" == "--cinematic" ]] && cinematic=true
done

options_header "$repo_dir" funding "$cinematic"
options_step "Validating network"

: "${YELTRA_RATE_OPTIONS_FUND_DEVELOPMENT_TESTNET_CONFIRMATION:?Set YELTRA_RATE_OPTIONS_FUND_DEVELOPMENT_TESTNET_CONFIRMATION=YELTRA_RATE_OPTIONS_FUND_DEVELOPMENT_TESTNET_46630 only after reviewing the funding inputs.}"
: "${YELTRA_OPTIONS_FUNDING_ADMIN_TESTNET:?Set the authorized YELTRA Testnet admin address.}"
: "${NEXT_PUBLIC_YELTRA_OPTIONS_COLLATERAL_TOKEN_TESTNET:?Set the deployed yDEVUSD address.}"
: "${NEXT_PUBLIC_YELTRA_OPTIONS_COLLATERAL_VAULT_TESTNET:?Set the deployed Options collateral vault address.}"
: "${NEXT_PUBLIC_YELTRA_OPTIONS_RATE_INDEX_TESTNET:?Set the deployed development rate index address.}"
: "${NEXT_PUBLIC_YELTRA_OPTIONS_MARKET_TESTNET:?Set the deployed Options market address.}"
: "${YELTRA_OPTIONS_DEMO_WALLET_TESTNET:?Set the explicitly authorized demo wallet address.}"
: "${YELTRA_OPTIONS_CALL_NOTIONAL_TESTNET:?Set the Call notional in raw 6-decimal yDEVUSD units.}"
: "${YELTRA_OPTIONS_PUT_NOTIONAL_TESTNET:?Set the Put notional in raw 6-decimal yDEVUSD units.}"

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

options_step "Checking authorized funding account"
funding_admin="$YELTRA_OPTIONS_FUNDING_ADMIN_TESTNET"
options_validate_yeltra_testnet_keystore "$funding_admin"
balance_wei="$(cast balance "$funding_admin" --rpc-url "$rpc_url")"

options_step "Verifying admin permissions"
access_manager="${YELTRA_OPTIONS_ACCESS_MANAGER_TESTNET:-0x3aaB079e0017aF37C15C7aB11e319995cf426097}"
admin_role="$(cast keccak 'CLEAVE_ADMIN')"
admin_status="$(cast call "$access_manager" 'hasRole(bytes32,address)(bool)' "$admin_role" "$funding_admin" --rpc-url "$rpc_url")"
if [[ "$admin_status" != "true" ]]; then
  options_status_marker "!" yellow; printf ' Funding account lacks CLEAVE_ADMIN on the configured Access Manager.\n' >&2
  exit 1
fi

options_step "Reading funding configuration"
options_section "FUNDING INPUTS"
options_line "Network" "Robinhood Chain Testnet · 46630"
options_line "Funding admin" "$funding_admin"
options_line "Balance" "$balance_wei wei"
options_line "Collateral" "$NEXT_PUBLIC_YELTRA_OPTIONS_COLLATERAL_TOKEN_TESTNET · yDEVUSD required"
options_line "Options market" "$NEXT_PUBLIC_YELTRA_OPTIONS_MARKET_TESTNET"
options_line "Demo wallet" "$YELTRA_OPTIONS_DEMO_WALLET_TESTNET"
options_line "Call notional" "$YELTRA_OPTIONS_CALL_NOTIONAL_TESTNET raw units"
options_line "Put notional" "$YELTRA_OPTIONS_PUT_NOTIONAL_TESTNET raw units"
options_pause 350 "$cinematic"

options_step "Validating collateral plan"
cd "$repo_dir"
bun run options:testnet:preflight

options_step "Minting exact-minimum development collateral"

cd "$contracts_dir"
forge build
forge script script/FundYeltraRateOptionsDevelopmentTestnet.s.sol:FundYeltraRateOptionsDevelopmentTestnet \
  --rpc-url "$rpc_url" \
  --keystore "$OPTIONS_YELTRA_TESTNET_KEYSTORE_PATH" \
  --sender "$funding_admin" \
  --broadcast \
  -vvvv

options_step "Confirming transactions"
status_args=()
if [[ "$cinematic" == true ]]; then status_args+=(--cinematic); fi
bun "$repo_dir/scripts/yeltra-options-testnet-status.ts" "${status_args[@]}"
