#!/usr/bin/env bash
set -euo pipefail

# Keep the familiar command, but route it through the fresh-admin encrypted
# keystore flow. The legacy raw-key/shared-AccessManager path is intentionally
# no longer available from this wrapper.
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec bash "$repo_dir/scripts/deploy-yeltra-rate-options-fresh-admin-testnet.sh" "$@"
