#!/usr/bin/env bash
# Starts and stops the shop as fat jars plus the local Redis, Kafka, and MinIO binaries.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${ROOT}"
cmd="${1:-}"
name="${2:-}"

stop_listed() {
  bash scripts/stop-all.sh || true
}

release_compose_ports() {
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi
  if ! docker info >/dev/null 2>&1; then
    return 0
  fi
  docker compose --project-directory "${ROOT}/deploy" -f "${ROOT}/deploy/docker-compose.yml" down --remove-orphans || true
}

start_shop() {
  mkdir -p logs
  setsid bash scripts/run-all.sh --no-build < /dev/null >> logs/run-all.log 2>&1 &
  wait "$!"
}

case "${cmd}" in
  redeploy)
    stop_listed
    release_compose_ports
    start_shop
    ;;
  stop)
    if [[ "${name}" == "redis" ]]; then
      redis-cli shutdown nosave || true
    elif [[ "${name}" == "kafka" ]]; then
      if [[ -f .run/kafka.pid ]]; then
        kill "$(cat .run/kafka.pid)" >/dev/null 2>&1 || true
        rm -f .run/kafka.pid
      fi
    else
      pkill -f "LOG_NAME=${name}" || true
    fi
    ;;
  logs)
    if [[ -f "logs/${name}.err.log" || -f "logs/${name}.log" ]]; then
      tail -n 40 "logs/${name}.log" "logs/${name}.err.log" 2>/dev/null || true
    else
      tail -n 40 logs/run-all.log
    fi
    ;;
  *)
    echo "Usage: bash scripts/vps/shop.sh redeploy|stop <name>|logs <name>" >&2
    exit 2
    ;;
esac
