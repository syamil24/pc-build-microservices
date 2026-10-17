#!/usr/bin/env bash
# Draws catalog art, uploads it to MinIO, and stores each public URL on the product row.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"
LOG_DIR="${HOME}/.apex-build"
mkdir -p "${LOG_DIR}" logs
LOG_FILE="${LOG_DIR}/pump-images.log"
log() {
  printf '[%s] %s\n' "$(date +%Y-%m-%dT%H:%M:%S)" "$*" | tee -a "${LOG_FILE}"
}
save_env_line() {
  local name="$1" value="$2" path="${ROOT}/.env" tmp
  tmp="$(mktemp)"
  if grep -q "^${name}=" "${path}"; then
    awk -v name="${name}" -v value="${value}" '
      index($0, name "=") == 1 { print name "=" value; next }
      { print }
    ' "${path}" > "${tmp}"
  else
    cat "${path}" > "${tmp}"
    printf '\n%s=%s\n' "${name}" "${value}" >> "${tmp}"
  fi
  mv "${tmp}" "${path}"
}
port_open() {
  if command -v nc >/dev/null 2>&1; then
    nc -z localhost "$1" >/dev/null 2>&1
  else
    (echo >/dev/tcp/127.0.0.1/"$1") >/dev/null 2>&1
  fi
}

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
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
if [[ -z "${MINIO_ROOT_USER:-}" ]]; then
  MINIO_ROOT_USER="apex"
  save_env_line MINIO_ROOT_USER "${MINIO_ROOT_USER}"
fi
if [[ -z "${MINIO_ROOT_PASSWORD:-}" ]]; then
  MINIO_ROOT_PASSWORD="Minio-$(openssl rand -hex 16)"
  save_env_line MINIO_ROOT_PASSWORD "${MINIO_ROOT_PASSWORD}"
  log "Saved a new MinIO password in .env"
fi
MINIO_API_PORT="${MINIO_API_PORT:-9000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"
MINIO_BUCKET="${MINIO_BUCKET:-catalog}"
MINIO_PUBLIC_URL="${MINIO_PUBLIC_URL:-http://127.0.0.1:${MINIO_API_PORT}}"
export MINIO_PUBLIC_URL MINIO_BUCKET

MINIO_HOME="${HOME}/.apex-build/minio"
if [[ ! -x "${MINIO_HOME}/minio" || ! -x "${MINIO_HOME}/mc" ]]; then
  log "ERROR: MinIO is missing. Run scripts/install-deps.sh"
  exit 1
fi
if ! port_open "${MINIO_API_PORT}"; then
  mkdir -p "${HOME}/.apex-build/minio-data"
  log "Starting MinIO"
  MINIO_ROOT_USER="${MINIO_ROOT_USER}" MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD}" \
    "${MINIO_HOME}/minio" server "${HOME}/.apex-build/minio-data" \
    --address "127.0.0.1:${MINIO_API_PORT}" --console-address "127.0.0.1:${MINIO_CONSOLE_PORT}" \
    >>logs/minio.log 2>&1 &
  echo $! >> .run/pids
  ready=0
  for _ in $(seq 1 20); do
    if port_open "${MINIO_API_PORT}"; then ready=1; break; fi
    sleep 1
  done
  if [[ "${ready}" != "1" ]]; then
    log "ERROR: MinIO did not start. See logs/minio.log"
    exit 1
  fi
else
  log "MinIO is already up"
fi

log "Drawing catalog images"
node scripts/images/emit-images.js
node scripts/images/emit-house-images.js
api="${MINIO_PUBLIC_URL%/}"
log "Uploading to ${api}/${MINIO_BUCKET}"
"${MINIO_HOME}/mc" alias set apex "${api}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null
"${MINIO_HOME}/mc" mb --ignore-existing "apex/${MINIO_BUCKET}" >/dev/null
"${MINIO_HOME}/mc" anonymous set download "apex/${MINIO_BUCKET}" >/dev/null
"${MINIO_HOME}/mc" cp --recursive --attr "Content-Type=image/svg+xml" scripts/images/out/ "apex/${MINIO_BUCKET}/"

export PGPASSWORD="${DB_PASSWORD}"
log "Saving image URLs on apex_inventory"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d apex_inventory -v ON_ERROR_STOP=1 -f scripts/images/image-urls.sql
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d apex_inventory -v ON_ERROR_STOP=1 -f scripts/images/image-urls-house.sql
count="$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" -d apex_inventory -tAc "SELECT count(*) FROM products WHERE image_url IS NOT NULL")"
log "Products with an image URL: ${count}"
log "Done"
