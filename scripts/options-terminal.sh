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
