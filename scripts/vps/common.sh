#!/usr/bin/env bash
# Shared helpers for the VPS scripts. Secrets are read and never printed.
set -Eeuo pipefail

vps_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

vps_load_env() {
  local root="$1"
  if [[ -f "${root}/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${root}/.env"
    set +a
  fi
}

vps_log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*"
}

vps_telegram() {
  local text="$1"
  if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
    vps_log "TELEGRAM is not set. ${text}"
    return 0
  fi
  curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${text}" >/dev/null
}

vps_compose() {
  local root="$1"
  shift
  if [[ -f "${HOME}/.apex-heal/heaps.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${HOME}/.apex-heal/heaps.env"
    set +a
  fi
  docker compose --project-directory "${root}/deploy" -f "${root}/deploy/docker-compose.yml" "$@"
}
