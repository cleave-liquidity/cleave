#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
contracts_dir="$repo_dir/contracts"
source "$repo_dir/scripts/options-terminal.sh"

cinematic=false
for arg in "$@"; do
  [[ "$arg" == "--cinematic" ]] && cinematic=true
done

options_header "$repo_dir" rate "$cinematic"
options_step "Validating Testnet target"

: "${YELTRA_RATE_OPTIONS_PUBLISH_TESTNET_CONFIRMATION:?Set YELTRA_RATE_OPTIONS_PUBLISH_TESTNET_CONFIRMATION=YELTRA_RATE_OPTIONS_PUBLISH_TESTNET_46630 only after approving this development-rate update.}"
: "${YELTRA_OPTIONS_RATE_PUBLISHER_TESTNET:?Set an existing CLEAVE_ADMIN or CLEAVE_OPERATOR address; sign with Ledger or an authorized account.}"
: "${NEXT_PUBLIC_YELTRA_OPTIONS_RATE_INDEX_TESTNET:?Set the deployed Testnet development Rate Index address.}"
: "${YELTRA_OPTIONS_UPDATED_RATE_TESTNET:?Set the explicitly chosen development rate in 1e18 units. This is not live oracle data.}"

if [[ ! "$YELTRA_OPTIONS_UPDATED_RATE_TESTNET" =~ ^[0-9]+$ ]] || (( YELTRA_OPTIONS_UPDATED_RATE_TESTNET > 1000000000000000000 )); then
  options_status_marker "✕" red; printf ' Refusing rate update: rate must be an integer from 0 through 1e18.\n' >&2
  exit 1
fi

rpc_url="${ROBINHOOD_TESTNET_RPC_URL:-${NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL:-}}"
if [[ -z "$rpc_url" ]]; then
  options_status_marker "✕" red; printf ' Missing Robinhood Chain Testnet RPC URL.\n' >&2
  exit 1
fi

chain_id="$(cast chain-id --rpc-url "$rpc_url")"
if [[ "$chain_id" != "46630" ]]; then
  options_status_marker "✕" red; printf ' Refusing rate update: expected chain 46630, got %s.\n' "$chain_id" >&2
  exit 1
fi

access_manager="$(cast call "$NEXT_PUBLIC_YELTRA_OPTIONS_RATE_INDEX_TESTNET" 'accessManager()(address)' --rpc-url "$rpc_url")"
admin_role="$(cast keccak 'CLEAVE_ADMIN')"
operator_role="$(cast keccak 'CLEAVE_OPERATOR')"
admin_status="$(cast call "$access_manager" 'hasRole(bytes32,address)(bool)' "$admin_role" "$YELTRA_OPTIONS_RATE_PUBLISHER_TESTNET" --rpc-url "$rpc_url")"
operator_status="$(cast call "$access_manager" 'hasRole(bytes32,address)(bool)' "$operator_role" "$YELTRA_OPTIONS_RATE_PUBLISHER_TESTNET" --rpc-url "$rpc_url")"
if [[ "$admin_status" != "true" && "$operator_status" != "true" ]]; then
  options_status_marker "✕" red; printf ' Refusing rate update: configured publisher has neither CLEAVE_ADMIN nor CLEAVE_OPERATOR.\n' >&2
  exit 1
fi

current_rate="$(cast call "$NEXT_PUBLIC_YELTRA_OPTIONS_RATE_INDEX_TESTNET" 'latestRate()(uint256)' --rpc-url "$rpc_url")"
observed_at="$(cast call "$NEXT_PUBLIC_YELTRA_OPTIONS_RATE_INDEX_TESTNET" 'latestObservedAt()(uint64)' --rpc-url "$rpc_url")"
source_label="$(cast call "$NEXT_PUBLIC_YELTRA_OPTIONS_RATE_INDEX_TESTNET" 'sourceLabel()(string)' --rpc-url "$rpc_url")"
publisher_role="CLEAVE_OPERATOR"
[[ "$admin_status" == "true" ]] && publisher_role="CLEAVE_ADMIN"

options_section "DEVELOPMENT RATE UPDATE"
options_line "Network" "Robinhood Chain Testnet · 46630"
options_line "Publisher" "$YELTRA_OPTIONS_RATE_PUBLISHER_TESTNET"
options_line "Role" "$publisher_role"
options_line "Index label" "$source_label"
options_line "Current rate" "$current_rate · 1e18 scale · observed $observed_at"
options_line "New rate" "$YELTRA_OPTIONS_UPDATED_RATE_TESTNET · 1e18 scale · OPERATOR-PUBLISHED DEVELOPMENT DATA"
options_line "Oracle claim" "NONE · NOT EXTERNAL OR VERIFIED YIELD DATA"
options_pause 350 "$cinematic"

options_step "Publishing explicitly configured development value"
cd "$contracts_dir"
forge build
forge script script/PublishYeltraRateOptionsDevelopmentRateTestnet.s.sol:PublishYeltraRateOptionsDevelopmentRateTestnet \
  --rpc-url "$rpc_url" \
  --ledger \
  --sender "$YELTRA_OPTIONS_RATE_PUBLISHER_TESTNET" \
  --broadcast \
  -vvvv

options_step "Reading updated Testnet state"
status_args=()
if [[ "$cinematic" == true ]]; then status_args+=(--cinematic); fi
bun "$repo_dir/scripts/yeltra-options-testnet-status.ts" "${status_args[@]}"
