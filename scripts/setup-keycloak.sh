#!/usr/bin/env bash
# Creates the apex realm, the apex-web client, and the demo users in Keycloak.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"
if [[ ! -f .env ]]; then
  echo ".env is missing" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8180}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
export KEYCLOAK_URL KEYCLOAK_ADMIN
if [[ -z "${KEYCLOAK_ADMIN_PASSWORD:-}" ]]; then
  echo "Set KEYCLOAK_ADMIN_PASSWORD in .env to the Keycloak master admin password." >&2
  exit 1
fi
if command -v psql >/dev/null 2>&1 && [[ -n "${DB_PASSWORD:-}" ]]; then
  export PGPASSWORD="${DB_PASSWORD}"
  APEX_CUSTOMER_ID="$(psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-postgres}" -d apex_auth -tAc "SELECT id FROM users WHERE lower(email) = lower('${DEMO_CUSTOMER_EMAIL}')" | tr -d '[:space:]')"
  APEX_ADMIN_ID="$(psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-postgres}" -d apex_auth -tAc "SELECT id FROM users WHERE lower(email) = lower('${DEMO_ADMIN_EMAIL}')" | tr -d '[:space:]')"
  export APEX_CUSTOMER_ID APEX_ADMIN_ID
fi
echo "Configuring the apex realm"
node scripts/keycloak/setup-realm.js
echo "Keycloak is ready for the shop"
