#!/usr/bin/env bash
# Applies each service Flyway migration. Safe to rerun. Bash 3.2 compatible (macOS).
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
  log "ERROR: DB_PASSWORD is empty."
  exit 1
fi
bash "${ROOT}/scripts/init-db.sh"
cd "${ROOT}"
migrate() {
  local module="$1" db="$2"
  log "Flyway migrate ${module} -> ${db}"
  mvn -B -pl "${module}" flyway:migrate \
    -Dflyway.url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${db}" \
    -Dflyway.user="${DB_USERNAME}" \
    -Dflyway.password="${DB_PASSWORD}"
}
migrate services/auth-service apex_auth
migrate services/user-service apex_user
migrate services/inventory-service apex_inventory
migrate services/order-service apex_order
migrate services/payment-service apex_payment
migrate services/shipping-service apex_shipping
log "Schema applied."
