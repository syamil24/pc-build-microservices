#!/usr/bin/env bash
# Creates the per-service databases. Each service applies its own Flyway schema on startup.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "${ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT}/.env"
  set +a
fi

: "${DB_HOST:=localhost}"
: "${DB_PORT:=5432}"
: "${DB_USERNAME:=postgres}"

log() { printf '[%s] %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*"; }
on_err() { log "ERROR at line $1: $2"; exit 1; }
trap 'on_err "$LINENO" "$BASH_COMMAND"' ERR

if [[ -z "${DB_PASSWORD:-}" ]]; then
  log "ERROR: DB_PASSWORD is empty. Set it in ${ROOT}/.env and rerun."
  exit 1
fi
export PGPASSWORD="${DB_PASSWORD}"

PSQL="${PSQL:-psql}"
if ! command -v "${PSQL}" >/dev/null 2>&1; then
  log "ERROR: psql was not found on PATH."
  exit 1
fi

log "Checking PostgreSQL at ${DB_HOST}:${DB_PORT}"
"${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d postgres -v ON_ERROR_STOP=1 -c "SELECT version();"

for db in apex_auth apex_user apex_inventory apex_order apex_payment apex_shipping apex_report apex_keycloak; do
  exists="$("${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'")"
  if [[ "${exists}" == "1" ]]; then
    log "Database ${db} already exists"
  else
    log "Creating database ${db}"
    "${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${db}"
  fi
done

log "Databases are ready. Table schema is applied by Flyway when each service starts."
log "To apply schema without starting the apps: ./scripts/apply-schema.sh"
