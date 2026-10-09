#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
contracts_dir="$repo_dir/contracts"
source "$repo_dir/scripts/options-terminal.sh"

cinematic=false
broadcast=false
for arg in "$@"; do
  case "$arg" in
    --cinematic) cinematic=true ;;
    --broadcast) broadcast=true ;;
    *) printf 'Unknown option: %s\nUsage: bun run options:deploy:fresh-admin:testnet [-- --cinematic] [--broadcast]\n' "$arg" >&2; exit 2 ;;
  esac
done

options_header "$repo_dir" deployment "$cinematic"
options_step "Validating isolated Testnet deployment configuration"

: "${YELTRA_OPTIONS_FRESH_ADMIN_TESTNET:?Set the new YELTRA Testnet admin public address; placeholder values are rejected.}"
: "${YELTRA_OPTIONS_DEPLOYMENT_KEYSTORE_TESTNET:?Set the Foundry encrypted keystore account name.}"
: "${YELTRA_OPTIONS_INITIAL_RATE_TESTNET:?Set an explicitly chosen development rate in 1e18 units.}"
: "${YELTRA_OPTIONS_FRESH_ADMIN_DEPLOY_TESTNET_CONFIRMATION:?Set the exact confirmation string after reviewing this configuration.}"

if [[ ! "$YELTRA_OPTIONS_FRESH_ADMIN_TESTNET" =~ ^0x[0-9a-fA-F]{40}$ ]] \
  || [[ "${YELTRA_OPTIONS_FRESH_ADMIN_TESTNET,,}" == "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b" ]]; then
  options_status_marker "✕" red; printf ' Refusing deployment: admin address is invalid or is the exposed historical admin.\n' >&2
  exit 1
fi
if [[ ! "$YELTRA_OPTIONS_INITIAL_RATE_TESTNET" =~ ^[0-9]+$ ]] \
  || (( YELTRA_OPTIONS_INITIAL_RATE_TESTNET > 1000000000000000000 )); then
  options_status_marker "✕" red; printf ' Refusing deployment: development rate must be an explicit integer from 0 through 1e18.\n' >&2
  exit 1
fi
if [[ "$YELTRA_OPTIONS_FRESH_ADMIN_DEPLOY_TESTNET_CONFIRMATION" != "YELTRA_OPTIONS_FRESH_ADMIN_DEPLOY_TESTNET_46630" ]]; then
  options_status_marker "✕" red; printf ' Refusing deployment: exact Testnet deployment confirmation is missing.\n' >&2
  exit 1
fi

keystore_dir="$HOME/.foundry/keystores"
keystore_path="$keystore_dir/$YELTRA_OPTIONS_DEPLOYMENT_KEYSTORE_TESTNET"
if [[ "$YELTRA_OPTIONS_DEPLOYMENT_KEYSTORE_TESTNET" != "yeltra-options-testnet-admin" ]]; then
  options_status_marker "✕" red; printf ' Refusing deployment: this workflow only accepts yeltra-options-testnet-admin.\n' >&2
  exit 1
fi
if [[ ! -f "$keystore_path" ]]; then
  options_status_marker "✕" red; printf ' Encrypted Foundry keystore is not present in the default keystore directory.\n' >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  options_status_marker "✕" red; printf ' jq is required to validate only the keystore public-address metadata.\n' >&2
  exit 1
fi
keystore_address="$(jq -er '(.address | tostring | ascii_downcase | sub("^0x"; "")) as $a | select($a | test("^[0-9a-f]{40}$")) | "0x" + $a' "$keystore_path" 2>/dev/null || true)"
if [[ -z "$keystore_address" || "${keystore_address,,}" != "${YELTRA_OPTIONS_FRESH_ADMIN_TESTNET,,}" ]]; then
  options_status_marker "✕" red; printf ' Keystore is missing valid public-address metadata or does not match the configured admin address.\n' >&2
  exit 1
fi
if ! wallet_list="$(cast wallet list --dir "$keystore_dir" 2>/dev/null)" \
  || ! printf '%s\n' "$wallet_list" | awk -v wanted="$YELTRA_OPTIONS_DEPLOYMENT_KEYSTORE_TESTNET" '$1 == wanted { found=1 } END { exit !found }'; then
  options_status_marker "✕" red; printf ' Foundry does not enumerate the requested keystore as a usable account.\n' >&2
  exit 1
fi

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

admin_balance="$(cast balance "$YELTRA_OPTIONS_FRESH_ADMIN_TESTNET" --rpc-url "$rpc_url")"
options_section "FRESH YELTRA TESTNET ADMIN"
options_line "Network" "Robinhood Chain Testnet · 46630"
options_line "Admin address" "$YELTRA_OPTIONS_FRESH_ADMIN_TESTNET"
options_line "Foundry account" "$YELTRA_OPTIONS_DEPLOYMENT_KEYSTORE_TESTNET · encrypted keystore"
options_line "Native balance" "$admin_balance wei · exact gas estimate appears in Foundry simulation"
options_line "Initial rate" "$YELTRA_OPTIONS_INITIAL_RATE_TESTNET · explicitly configured development data"
options_line "Deployment sequence" "AccessManager → yDEVUSD → Rate Index → Vault → Market → setMarket"
options_line "Expected transactions" "6 · five CREATE + one vault wiring call"
options_line "Broadcast mode" "$([[ "$broadcast" == true ]] && printf 'EXPLICITLY REQUESTED' || printf 'DRY RUN · NO BROADCAST')"

options_step "Simulating and validating new contract wiring"
cd "$contracts_dir"
forge build
forge_args=(
  script script/DeployYeltraRateOptionsFreshAdminTestnet.s.sol:DeployYeltraRateOptionsFreshAdminTestnet
  --rpc-url "$rpc_url"
  --sender "$YELTRA_OPTIONS_FRESH_ADMIN_TESTNET"
  -vvvv
)
if [[ "$broadcast" == true ]]; then
  options_line "Approval guard" "EXACT DEPLOYMENT CONFIRMATION PRESENT"
  forge script "${forge_args[@]}" \
    --account "$YELTRA_OPTIONS_DEPLOYMENT_KEYSTORE_TESTNET" \
    --broadcast \
    --slow
else
  forge script "${forge_args[@]}"
fi

if [[ "$broadcast" == true ]]; then
  options_step "Deployment broadcast completed; refresh public address configuration from confirmed receipts"
else
  options_step "Dry run complete · no blockchain transaction sent"
fi
