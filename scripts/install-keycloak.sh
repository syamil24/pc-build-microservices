#!/usr/bin/env bash
# Downloads Keycloak 25.0.4 and points it at a new Postgres database, apex_keycloak.
# The conf file follows a local keycloak.conf: db=postgres and a JDBC URL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"
mkdir -p .run
log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

HOME_DIR="${KEYCLOAK_HOME:-${HOME}/.apex-build/keycloak}"
fresh=0
if [[ ! -x "${HOME_DIR}/bin/kc.sh" ]]; then
  log "Downloading Keycloak 25.0.4"
  tmp="$(mktemp -d)"
  curl -fL --retry 3 -o "${tmp}/keycloak.tar.gz" "https://github.com/keycloak/keycloak/releases/download/25.0.4/keycloak-25.0.4.tar.gz"
  tar -xzf "${tmp}/keycloak.tar.gz" -C "${tmp}"
  rm -rf "${HOME_DIR}"
  mkdir -p "$(dirname "${HOME_DIR}")"
  mv "${tmp}/keycloak-25.0.4" "${HOME_DIR}"
  rm -rf "${tmp}"
  fresh=1
fi
if [[ "${fresh}" -eq 1 || ! -f "${HOME_DIR}/conf/keycloak.conf" ]]; then
cat > "${HOME_DIR}/conf/keycloak.conf" <<EOF
db=postgres
db-username=${DB_USERNAME}
db-password=${DB_PASSWORD}
db-url=jdbc:postgresql://${DB_HOST}:${DB_PORT}/apex_keycloak
http-enabled=true
hostname-strict=false
health-enabled=true
EOF
fi
printf '%s\n' "${HOME_DIR}" > .run/keycloak-home.txt
log "Installed Keycloak at ${HOME_DIR} (database apex_keycloak)"
