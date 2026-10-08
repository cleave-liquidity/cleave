#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-}"
BROADCAST="${2:-}"
if (( $# > 2 )); then
  echo "Usage: $0 {deploy|setup|event} [--broadcast]" >&2
  exit 2
fi
case "$ACTION" in
  deploy)
    SCRIPT="script/DeployYeltraDividendDemoYieldTokenTestnet.s.sol:DeployYeltraDividendDemoYieldTokenTestnet"
    CONFIRMATION_ENV="YELTRA_DIVIDEND_DEMO_DEPLOY_CONFIRMATION"
    EXPECTED_CONFIRMATION="YELTRA_DIVIDEND_DEMO_DEPLOY_46630"
    CONFIRMATION_VALUE="${YELTRA_DIVIDEND_DEMO_DEPLOY_CONFIRMATION:-}"
    ;;
  setup)
    SCRIPT="script/SetupYeltraDividendDemoTestnet.s.sol:SetupYeltraDividendDemoTestnet"
    CONFIRMATION_ENV="YELTRA_DIVIDEND_DEMO_SETUP_CONFIRMATION"
    EXPECTED_CONFIRMATION="YELTRA_DIVIDEND_DEMO_SETUP_46630"
    CONFIRMATION_VALUE="${YELTRA_DIVIDEND_DEMO_SETUP_CONFIRMATION:-}"
    ;;
  event)
    SCRIPT="script/ProcessYeltraDividendDemoEventTestnet.s.sol:ProcessYeltraDividendDemoEventTestnet"
    CONFIRMATION_ENV="YELTRA_DIVIDEND_DEMO_EVENT_CONFIRMATION"
    EXPECTED_CONFIRMATION="YELTRA_DIVIDEND_DEMO_EVENT_46630"
    CONFIRMATION_VALUE="${YELTRA_DIVIDEND_DEMO_EVENT_CONFIRMATION:-}"
    ;;
  *)
    echo "Usage: $0 {deploy|setup|event} [--broadcast]" >&2
    exit 2
    ;;
esac

if [[ "$BROADCAST" != "" && "$BROADCAST" != "--broadcast" ]]; then
  echo "Only the explicit --broadcast option is accepted." >&2
  exit 2
fi
if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  echo "DEPLOYER_PRIVATE_KEY is required in the local shell; it is never printed." >&2
  exit 2
fi
if [[ -z "${YELTRA_DIVIDEND_DEMO_WALLET_TESTNET:-}" ]]; then
  echo "Set YELTRA_DIVIDEND_DEMO_WALLET_TESTNET to the authorized public demo wallet address." >&2
  exit 2
fi
if [[ "$ACTION" != "deploy" && -z "${YELTRA_DIVIDEND_DEMO_TOKEN_TESTNET:-}" ]]; then
  echo "Set YELTRA_DIVIDEND_DEMO_TOKEN_TESTNET to the deployed development token address." >&2
  exit 2
fi
if [[ "$CONFIRMATION_VALUE" != "$EXPECTED_CONFIRMATION" ]]; then
  echo "Set $CONFIRMATION_ENV to $EXPECTED_CONFIRMATION after reviewing the target and effect." >&2
  exit 2
fi

RPC_URL="${ROBINHOOD_TESTNET_RPC_URL:-https://rpc.testnet.chain.robinhood.com}"
CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
if [[ "$CHAIN_ID" != "46630" ]]; then
  echo "Refusing operation: RPC reports chain $CHAIN_ID, expected Robinhood Chain Testnet 46630." >&2
  exit 2
fi

case "$ACTION" in
  deploy) echo "YELTRA DIVIDEND DEMO TOKEN · TESTNET 46630 · designated wallet $YELTRA_DIVIDEND_DEMO_WALLET_TESTNET" ;;
  setup) echo "YELTRA DIVIDEND DEMO POSITION · TESTNET 46630 · existing Dividend Registry · fixed 2 yNVDA-DEV exposure · no user-supplied amount" ;;
  event) echo "SIMULATED REFERENCE EVENT · TESTNET 46630 · 0.25 per token · accounting only · no payout" ;;
esac

FORGE_ARGS=(script --root contracts "$SCRIPT" --rpc-url "$RPC_URL" -vvvv)
if [[ "$BROADCAST" == "--broadcast" ]]; then
  echo "BROADCAST MODE EXPLICITLY REQUESTED. Forge will submit Testnet transactions after its role and state checks."
  FORGE_ARGS+=(--broadcast)
else
  echo "DRY RUN ONLY · no transaction will be broadcast. Add --broadcast only after explicit approval."
fi

forge "${FORGE_ARGS[@]}"
