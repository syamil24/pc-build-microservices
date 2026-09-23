#!/usr/bin/env bash
# Build the jars, start the Compose stack, and smoke-test the gateway.
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
ROOT="$(vps_root)"
cd "${ROOT}"
vps_load_env "${ROOT}"

on_err() {
  vps_log "ERROR at line $1: $2"
  vps_telegram "Deploy failed at line $1: $2"
  exit 1
}
trap 'on_err "$LINENO" "$BASH_COMMAND"' ERR

if [[ ! -f "${ROOT}/.env" ]]; then
  vps_log "ERROR: ${ROOT}/.env is missing. Copy .env.example and set the passwords on this machine."
  exit 1
fi

SHA="${APEX_DEPLOY_SHA:-$(git rev-parse HEAD)}"
if [[ -n "${APEX_DEPLOY_SHA:-}" ]]; then
  git fetch --all --prune
  git checkout --detach "${APEX_DEPLOY_SHA}"
fi

vps_log "Packaging ${SHA}"
mvn -B -DskipTests package

vps_log "Starting Compose"
vps_compose "${ROOT}" up -d --build

vps_log "Waiting for the gateway"
ready=0
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:8080/actuator/health" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 5
done

if [[ "${ready}" -ne 1 ]]; then
  vps_telegram "Deploy ${SHA} failed. Gateway health did not become ready. Previous containers were already replaced by this attempt."
  exit 1
fi

if bash "${ROOT}/scripts/smoke-test.sh"; then
  vps_telegram "Deploy ${SHA} is up. Smoke test passed."
else
  vps_telegram "Deploy ${SHA} failed the smoke test. The new containers are still running so the logs can be read."
  exit 1
fi
