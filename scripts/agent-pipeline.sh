#!/usr/bin/env bash
# Local agent loop: unit tests, webapp build, UI tests, optional API smoke, optional push.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*"; }
on_err() { log "ERROR at line $1: $2"; exit 1; }
trap 'on_err "$LINENO" "$BASH_COMMAND"' ERR

log "Unit tests"
mvn -B test
log "Webapp build and UI tests"
(cd webapp && npm install && npm run build && npx playwright install chromium && npm run test:e2e)
if curl -fsS http://127.0.0.1:8080/actuator/health >/dev/null 2>&1; then
  log "API smoke"
  bash scripts/smoke-test.sh
else
  log "Gateway is down, skipped live API smoke"
fi
if [[ "${APEX_PUSH:-false}" == "true" ]]; then
  if git remote get-url origin >/dev/null 2>&1; then
    log "Pushing current branch"
    git push -u origin HEAD
  else
    log "ERROR: APEX_PUSH=true but no origin remote is configured"
    exit 1
  fi
fi
log "Pipeline finished"
