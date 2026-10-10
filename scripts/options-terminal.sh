#!/usr/bin/env bash

options_use_color=false
if [[ -t 1 ]]; then
  options_use_color=true
fi

OPTIONS_RESET=$'\033[0m'
OPTIONS_DIM=$'\033[2m'
OPTIONS_BLUE=$'\033[38;2;59;130;246m'
OPTIONS_ICE=$'\033[38;5;159m'
OPTIONS_GREEN=$'\033[38;5;120m'
OPTIONS_YELLOW=$'\033[38;5;221m'
OPTIONS_RED=$'\033[38;5;203m'
OPTIONS_WHITE=$'\033[38;5;255m'

options_paint() {
  local value="$1"
  local color="$2"
  if [[ "$options_use_color" == true ]]; then
    printf '%s%s%s' "$color" "$value" "$OPTIONS_RESET"
  else
    printf '%s' "$value"
  fi
}

options_header() {
  local repo_dir="$1"
  local mode="$2"
  local cinematic="${3:-false}"
  if [[ "$cinematic" == true ]]; then
    bun "$repo_dir/scripts/options-terminal.ts" "$mode" --cinematic
  else
    bun "$repo_dir/scripts/options-terminal.ts" "$mode"
  fi
}

options_load_local_env() {
  local repo_dir="$1"
  shift
  local key value
  local env_file="$repo_dir/.env.local"

  [[ -f "$env_file" ]] || return 0
  for key in "$@"; do
    [[ -n "${!key:-}" ]] && continue
    value="$(awk -F= -v wanted="$key" '$1 == wanted {sub(/^[^=]*=/, ""); gsub(/^"|"$/, ""); print; exit}' "$env_file")"
    if [[ -n "$value" ]]; then
      export "$key=$value"
    fi
  done
}

options_section() {
  printf '\n'
  options_paint "◆ $1" "$OPTIONS_BLUE"
  printf '\n'
  options_paint "──────────────────────────────────────────────────────────────────" "$OPTIONS_DIM"
  printf '\n'
}

options_step() {
  printf '\n'
  options_paint "→ $1" "$OPTIONS_DIM"
  printf '\n'
}

options_line() {
  local label="$1"
  local value="$2"
  printf '%s' "$(options_paint "$(printf '%-38s' "$label ")" "$OPTIONS_DIM")"
  options_paint "$value" "$OPTIONS_WHITE"
  printf '\n'
}

options_pause() {
  local milliseconds="$1"
  local cinematic="${2:-false}"
  if [[ "$cinematic" != true || "${YELTRA_TERMINAL_NO_DELAY:-false}" == true ]]; then
    return
  fi
  sleep "$(awk "BEGIN { print $milliseconds / 1000 }")"
}

options_status_marker() {
  local marker="$1"
  local tone="$2"
  local color="$OPTIONS_WHITE"
  case "$tone" in
    green) color="$OPTIONS_GREEN" ;;
    yellow) color="$OPTIONS_YELLOW" ;;
    red) color="$OPTIONS_RED" ;;
  esac
  options_paint "$marker" "$color"
}

options_validate_yeltra_testnet_keystore() {
  local expected_address="$1"
  local account_name="${YELTRA_OPTIONS_DEPLOYMENT_KEYSTORE_TESTNET:-yeltra-options-testnet-admin}"
  local keystore_path="${YELTRA_OPTIONS_DEPLOYMENT_KEYSTORE_PATH_TESTNET:-$HOME/.foundry/keystores/$account_name}"
  local keystore_address

  if [[ "$keystore_path" == "~/"* ]]; then
    keystore_path="$HOME/${keystore_path:2}"
  fi

  if [[ ! "$account_name" =~ ^yeltra-options-testnet-admin(-[a-z0-9-]+)?$ ]]; then
    options_status_marker "✕" red; printf ' Refusing signer: keystore account must use the yeltra-options-testnet-admin name prefix.\n' >&2
    return 1
  fi
  if [[ ! "$expected_address" =~ ^0x[0-9a-fA-F]{40}$ ]] \
    || [[ "${expected_address,,}" == "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b" ]]; then
    options_status_marker "✕" red; printf ' Refusing signer: admin address is invalid or is the exposed historical account.\n' >&2
    return 1
  fi
  if [[ "$(basename "$keystore_path")" != "$account_name" ]]; then
    options_status_marker "✕" red; printf ' Refusing signer: explicit keystore path filename must match the configured Foundry account name.\n' >&2
    return 1
  fi
  if [[ ! -f "$keystore_path" ]]; then
    options_status_marker "✕" red; printf ' YELTRA Testnet encrypted keystore was not found at the configured path.\n' >&2
    return 1
  fi
  if ! command -v jq >/dev/null 2>&1; then
    options_status_marker "✕" red; printf ' jq is required to check public keystore metadata only.\n' >&2
    return 1
  fi
  if ! jq -e 'type == "object" and .version == 3 and (.crypto | type == "object")' "$keystore_path" >/dev/null 2>&1; then
    options_status_marker "✕" red; printf ' Configured file is not a valid encrypted Foundry keystore JSON document.\n' >&2
    return 1
  fi
  keystore_address="$(jq -r 'if has("address") then (.address | tostring | ascii_downcase | sub("^0x"; "")) as $a | if ($a | test("^[0-9a-f]{40}$")) then "0x" + $a else "__INVALID__" end else "__MISSING__" end' "$keystore_path")"
  if [[ "$keystore_address" == "__INVALID__" ]]; then
    options_status_marker "✕" red; printf ' Keystore contains malformed public address metadata.\n' >&2
    return 1
  fi
  if [[ "$keystore_address" == "__MISSING__" ]]; then
    options_status_marker "!" yellow; printf ' Keystore has no public address metadata; using its explicit file path. Foundry will prompt for its password only when signing.\n' >&2
  elif [[ "${keystore_address,,}" != "${expected_address,,}" ]]; then
    options_status_marker "✕" red; printf ' Keystore public-address metadata does not match the configured signer.\n' >&2
    return 1
  fi
  OPTIONS_YELTRA_TESTNET_KEYSTORE_PATH="$keystore_path"
}
