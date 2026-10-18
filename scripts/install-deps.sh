#!/usr/bin/env bash
# Installs JDK 21, Maven, Node.js, Redis, and a small Kafka broker.
# Works on Debian/Ubuntu (including WSL), Fedora/RHEL, Arch, and macOS (Homebrew).
set -Eeuo pipefail

LOG_DIR="${HOME}/.apex-build"
LOG_FILE="${LOG_DIR}/install.log"
mkdir -p "${LOG_DIR}"
bash "$(cd "$(dirname "$0")" && pwd)/log-roll.sh" || true

log() { printf '[%s] %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*" | tee -a "${LOG_FILE}"; }
on_err() {
  local line="$1" cmd="$2"
  log "ERROR at line ${line}: ${cmd}"
  log "The full log is ${LOG_FILE}"
  exit 1
}
trap 'on_err "$LINENO" "$BASH_COMMAND"' ERR

run() {
  log "RUN: $*"
  if ! "$@" >>"${LOG_FILE}" 2>&1; then
    log "ERROR: command failed: $*"
    log "----- last 80 log lines -----"
    tail -n 80 "${LOG_FILE}" >&2 || true
    exit 1
  fi
}

have() { command -v "$1" >/dev/null 2>&1; }

OS="$(uname -s)"
KERNEL="$(uname -r)"
log "Starting dependency install on ${OS} ${KERNEL}"

if [[ "${KERNEL}" == *[Mm]icrosoft* ]] || grep -qi microsoft /proc/version 2>/dev/null; then
  log "WSL detected. Using the Linux package manager inside this distro."
fi

install_debian() {
  run sudo apt-get update
  run sudo apt-get install -y openjdk-21-jdk maven curl tar ca-certificates redis-server postgresql-client
  if ! have node; then
    run sudo apt-get install -y nodejs npm
  fi
  if have systemctl && systemctl --user status >/dev/null 2>&1 || systemctl is-system-running >/dev/null 2>&1; then
    run sudo systemctl enable --now redis-server || log "redis-server service was not enabled; start it with redis-server --daemonize yes"
  else
    log "systemd is not running. Start Redis with: redis-server --daemonize yes"
  fi
}

install_fedora() {
  run sudo dnf install -y java-21-openjdk-devel maven curl tar redis nodejs npm postgresql
  run sudo systemctl enable --now redis || true
}

install_arch() {
  run sudo pacman -Sy --noconfirm jdk21-openjdk maven curl tar redis nodejs npm postgresql
  run sudo systemctl enable --now redis || true
}

install_mac() {
  if ! have brew; then
    log "ERROR: Homebrew is required on macOS. Install it from https://brew.sh and rerun."
    exit 1
  fi
  run brew install openjdk@21 maven node redis kafka
  log "Kafka formula from Homebrew is optional. This script still installs the Apache binary below if kafka-server-start is missing."
}

case "${OS}" in
  Linux)
    if have apt-get; then install_debian
    elif have dnf; then install_fedora
    elif have pacman; then install_arch
    else
      log "ERROR: unsupported Linux package manager. Install JDK 21, Maven, Node, and Redis yourself."
      exit 1
    fi
    ;;
  Darwin) install_mac ;;
  *)
    log "ERROR: ${OS} is not supported by this script. On Windows use scripts/install-deps.ps1, or run this inside WSL."
    exit 1
    ;;
esac

if ! have java || ! java -version 2>&1 | grep -q 'version "21'; then
  log "ERROR: Java 21 is not the active java. Adjust JAVA_HOME and retry."
  exit 1
fi

KAFKA_HOME="${HOME}/.apex-build/kafka"
if [[ ! -x "${KAFKA_HOME}/bin/kafka-server-start.sh" ]]; then
  log "Downloading Apache Kafka 3.9.0 (KRaft, no ZooKeeper)"
  TMP="$(mktemp -d)"
  URL="https://archive.apache.org/dist/kafka/3.9.0/kafka_2.13-3.9.0.tgz"
  run curl -fL --retry 3 -o "${TMP}/kafka.tgz" "${URL}"
  run tar -xzf "${TMP}/kafka.tgz" -C "${TMP}"
  rm -rf "${KAFKA_HOME}"
  mv "${TMP}/kafka_2.13-3.9.0" "${KAFKA_HOME}"
  rm -rf "${TMP}"
fi

log "Installed. Java: $(java -version 2>&1 | head -n 1)"
log "Maven: $(mvn -version 2>&1 | head -n 1)"
log "Node: $(node -v 2>/dev/null || echo missing)"
log "Redis CLI: $(command -v redis-cli || echo missing)"
log "Kafka: ${KAFKA_HOME}"

MINIO_HOME="${HOME}/.apex-build/minio"
mkdir -p "${MINIO_HOME}"
case "$(uname -m)" in
  arm64|aarch64) MINIO_ARCH="arm64" ;;
  x86_64|amd64) MINIO_ARCH="amd64" ;;
  *)
    log "ERROR: no MinIO build for $(uname -m)"
    exit 1
    ;;
esac
case "${OS}" in
  Darwin) MINIO_OS="darwin" ;;
  Linux) MINIO_OS="linux" ;;
  *)
    log "ERROR: no MinIO build for ${OS}"
    exit 1
    ;;
esac
# Last community builds that still publish binaries. Newer MinIO tags are source-only.
MINIO_RELEASE="RELEASE.2025-09-07T16-13-09Z"
MC_RELEASE="RELEASE.2025-08-13T08-35-41Z"
if [[ ! -x "${MINIO_HOME}/minio" ]]; then
  log "Downloading MinIO server ${MINIO_RELEASE}"
  run curl -fL --retry 3 -o "${MINIO_HOME}/minio" "https://github.com/minio/minio/releases/download/${MINIO_RELEASE}/minio.${MINIO_OS}-${MINIO_ARCH}.${MINIO_RELEASE}"
  chmod +x "${MINIO_HOME}/minio"
fi
if [[ ! -x "${MINIO_HOME}/mc" ]]; then
  log "Downloading MinIO client ${MC_RELEASE}"
  run curl -fL --retry 3 -o "${MINIO_HOME}/mc" "https://github.com/minio/mc/releases/download/${MC_RELEASE}/mc.${MINIO_OS}-${MINIO_ARCH}.${MC_RELEASE}"
  chmod +x "${MINIO_HOME}/mc"
fi
log "MinIO: ${MINIO_HOME}"
log "Done. Log: ${LOG_FILE}"
