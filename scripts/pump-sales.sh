#!/usr/bin/env bash
# Loads demo orders into apex_order and sales facts into apex_report.
# Re-running updates the same ids. The demo customer must already exist.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"
LOG="${HOME}/.apex-build/pump-sales.log"
mkdir -p "$(dirname "${LOG}")"
bash scripts/log-roll.sh || true
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
  log "ERROR: node is required to build the sales SQL"
  exit 1
fi

: "${DB_HOST:=localhost}"
: "${DB_PORT:=5432}"
: "${DB_USERNAME:=postgres}"
: "${DEMO_CUSTOMER_EMAIL:=customer@apexbuild.local}"
export PGPASSWORD="${DB_PASSWORD}"
PSQL="${PSQL:-psql}"

log "Building order and sales SQL"
node scripts/sales/emit-sales.js | tee -a "${LOG}"

exists="$("${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='apex_report'")"
if [[ "${exists}" != "1" ]]; then
  log "Creating database apex_report"
  "${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE apex_report"
fi

customer_id="$("${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d apex_auth -tAc "SELECT id FROM users WHERE email='${DEMO_CUSTOMER_EMAIL}'" | tr -d '[:space:]')"
if [[ -z "${customer_id}" ]]; then
  log "ERROR: demo customer ${DEMO_CUSTOMER_EMAIL} was not found. Start the stack once so auth can seed it, then rerun."
  exit 1
fi
column="$("${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d apex_order -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='order_lines' AND column_name='category_code'" | tr -d '[:space:]')"
if [[ "${column}" != "1" ]]; then
  log "ERROR: order_lines.category_code is missing. Restart order-service so Flyway can add it, then rerun."
  exit 1
fi
facts="$("${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d apex_report -tAc "SELECT to_regclass('sales_facts')" | tr -d '[:space:]')"
if [[ -z "${facts}" ]]; then
  log "ERROR: sales_facts is missing. Start report-service once so Flyway can create it, then rerun."
  exit 1
fi

log "Applying orders for ${customer_id}"
"${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d apex_order -v ON_ERROR_STOP=1 -v "customer_id=${customer_id}" -f scripts/sales/orders.sql >>"${LOG}" 2>&1
log "Applying sales facts"
"${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d apex_report -v ON_ERROR_STOP=1 -f scripts/sales/sales.sql >>"${LOG}" 2>&1
COUNT="$("${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d apex_report -tAc "SELECT to_char(paid_on, 'YYYY-MM') || ':' || category_code || ':' || count(*)::text FROM sales_facts GROUP BY to_char(paid_on, 'YYYY-MM'), category_code ORDER BY to_char(paid_on, 'YYYY-MM'), category_code")"
log "Sales facts by month and category:"
printf '%s\n' "${COUNT}" | tee -a "${LOG}"
log "Sales pump finished. Log: ${LOG}"
