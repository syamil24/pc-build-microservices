#!/usr/bin/env bash
# Loads scripts/catalog/catalog.sql into apex_inventory. Re-running updates the same SKUs.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"
LOG="${HOME}/.apex-build/pump-catalog.log"
mkdir -p "$(dirname "${LOG}")"
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*" | tee -a "${LOG}"; }
on_err() { log "ERROR at line $1: $2"; exit 1; }
trap 'on_err "$LINENO" "$BASH_COMMAND"' ERR

if [[ ! -f .env ]]; then
  log "ERROR: .env is missing. Copy .env.example and set DB_PASSWORD."
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a
if [[ -z "${DB_PASSWORD:-}" ]]; then
  log "ERROR: DB_PASSWORD is empty in .env"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  log "ERROR: node is required to build scripts/catalog/catalog.sql"
  exit 1
fi
log "Building catalog SQL"
node scripts/catalog/emit-sql.js | tee -a "${LOG}"

export PGPASSWORD="${DB_PASSWORD}"
PSQL="${PSQL:-psql}"
log "Applying catalog to apex_inventory on ${DB_HOST:-localhost}:${DB_PORT:-5432}"
"${PSQL}" -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-postgres}" -d apex_inventory -v ON_ERROR_STOP=1 -f scripts/catalog/catalog.sql >>"${LOG}" 2>&1
COUNT="$("${PSQL}" -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-postgres}" -d apex_inventory -tAc "SELECT category_code || ':' || count(*)::text FROM products GROUP BY category_code ORDER BY category_code")"
log "Products by category:"
printf '%s\n' "${COUNT}" | tee -a "${LOG}"
log "Catalog pump finished. Log: ${LOG}"
