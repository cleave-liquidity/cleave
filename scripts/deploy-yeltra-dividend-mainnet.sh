#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
contracts_dir="$repo_dir/contracts"
mode="${1:-dry-run}"

if [[ "$mode" != "dry-run" && "$mode" != "--broadcast" ]]; then
  printf 'Usage: %s [dry-run|--broadcast]\n' "$0" >&2
  exit 2
fi

: "${YELTRA_DIVIDEND_MAINNET_ADMIN_SAFE:?Set the deployed Safe/multisig address that will hold all AccessManager roles.}"
: "${YELTRA_DIVIDEND_MAINNET_DEPLOYER_ADDRESS:?Set the fresh signer address used for this deployment.}"
: "${YELTRA_DIVIDEND_MAINNET_CONFIRMATION:?Set YELTRA_DIVIDEND_MAINNET_CONFIRMATION=YELTRA_DIVIDEND_MAINNET_DEPLOY_4663.}"

safe_address="${YELTRA_DIVIDEND_MAINNET_ADMIN_SAFE,,}"
if [[ ! "$safe_address" =~ ^0x[0-9a-f]{40}$ || "$safe_address" == "0x0000000000000000000000000000000000000000" ]]; then
  printf 'Refusing Dividend deployment: admin Safe address is invalid or zero.\n' >&2
  exit 1
fi

if [[ "$YELTRA_DIVIDEND_MAINNET_CONFIRMATION" != "YELTRA_DIVIDEND_MAINNET_DEPLOY_4663" ]]; then
  printf 'Refusing Dividend Mainnet deployment: confirmation token is invalid.\n' >&2
  exit 1
fi

# Never load .env.local and never accept a raw deployment key through this wrapper.
for secret_name in MAINNET_DEPLOYER_PRIVATE_KEY MAINNET_PRIVATE_KEY DEPLOYER_PRIVATE_KEY PRIVATE_KEY ETH_PRIVATE_KEY; do
  if [[ -n "${!secret_name:-}" ]]; then
    printf 'Refusing deployment: raw private-key environment variable %s is set. Use a Foundry keystore account.\n' "$secret_name" >&2
    exit 1
  fi
done

rpc_url="${ROBINHOOD_MAINNET_RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"
chain_id="$(cast chain-id --rpc-url "$rpc_url")"
if [[ "$chain_id" != "4663" ]]; then
  printf 'Refusing Dividend deployment: expected Robinhood Chain Mainnet 4663, got %s.\n' "$chain_id" >&2
  exit 1
fi

safe_code="$(cast code "$safe_address" --rpc-url "$rpc_url")"
if [[ "$safe_code" == "0x" || -z "$safe_code" ]]; then
  printf 'Refusing Dividend deployment: admin address has no contract bytecode.\n' >&2
  exit 1
fi

legacy_exposed_deployer="0x67214bdf8597d46aaef7110983e2276dd2235f6e"
deployer_address="${YELTRA_DIVIDEND_MAINNET_DEPLOYER_ADDRESS,,}"
if [[ ! "$deployer_address" =~ ^0x[0-9a-f]{40}$ ]]; then
  printf 'Refusing Dividend deployment: deployer address is invalid.\n' >&2
  exit 1
fi
if [[ "$deployer_address" == "$legacy_exposed_deployer" ]]; then
  printf 'Refusing Dividend deployment: this signer is the previously exposed deployer.\n' >&2
  exit 1
fi

balance_wei="$(cast balance "$deployer_address" --rpc-url "$rpc_url")"
if [[ "$balance_wei" == "0" ]]; then
  printf 'Refusing Dividend deployment: signer needs Mainnet gas funds.\n' >&2
  exit 1
fi

forge_args=(
  script "$contracts_dir/script/DeployYeltraDividendMainnet.s.sol:DeployYeltraDividendMainnet"
  --root "$contracts_dir"
  --rpc-url "$rpc_url"
  --sender "$deployer_address"
  -vvv
)

printf 'Network: Robinhood Chain Mainnet · 4663\n'
printf 'Primary contract: YeltraDividendRegistry\n'
printf 'Admin Safe: %s\n' "$safe_address"
printf 'Deployer: %s\n' "$deployer_address"
printf 'Deployment graph: AccessManager → Registry (+ Accounting) → Lens\n'
printf 'Expected contracts: 4 · top-level create transactions: 3\n'
printf 'Markets configured: 0 · settlement: disabled\n'

if [[ "$mode" == "--broadcast" ]]; then
  : "${YELTRA_DIVIDEND_MAINNET_DEPLOYER_ACCOUNT:?Set the fresh encrypted Foundry keystore account name.}"
  : "${YELTRA_DIVIDEND_MAINNET_BROADCAST_CONFIRMATION:?Set YELTRA_DIVIDEND_MAINNET_BROADCAST_CONFIRMATION=DEPLOY_YELTRA_DIVIDEND_MAINNET_4663 after authorizing the reviewed deployment.}"
  if [[ "$YELTRA_DIVIDEND_MAINNET_BROADCAST_CONFIRMATION" != "DEPLOY_YELTRA_DIVIDEND_MAINNET_4663" ]]; then
    printf 'Refusing broadcast: broadcast confirmation token is invalid.\n' >&2
    exit 1
  fi
  if [[ ! -t 0 ]]; then
    printf 'Refusing broadcast: interactive confirmation is required.\n' >&2
    exit 1
  fi
  account_address="$(cast wallet address --account "$YELTRA_DIVIDEND_MAINNET_DEPLOYER_ACCOUNT")"
  if [[ "${account_address,,}" != "$deployer_address" ]]; then
    printf 'Refusing broadcast: encrypted account does not match the declared deployer address.\n' >&2
    exit 1
  fi
  printf 'Broadcast confirmation required. Type exactly: DEPLOY YELTRA DIVIDEND REGISTRY ON MAINNET 4663\n'
  read -r typed_confirmation
  if [[ "$typed_confirmation" != "DEPLOY YELTRA DIVIDEND REGISTRY ON MAINNET 4663" ]]; then
    printf 'Broadcast cancelled: typed confirmation did not match.\n' >&2
    exit 1
  fi
  forge "${forge_args[@]}" --account "$YELTRA_DIVIDEND_MAINNET_DEPLOYER_ACCOUNT" --broadcast
else
  printf 'Mode: dry-run only; no transaction will be broadcast.\n'
  forge "${forge_args[@]}"
fi
