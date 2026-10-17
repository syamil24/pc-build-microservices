#!/usr/bin/env bash
# Stops Apex Build jars, the shop, and the Redis and Kafka processes this repo starts.
# macOS and Linux. Does not stop PostgreSQL.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="${HOME}/.apex-build"
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*"; }

stop_pid() {
  local pid="$1"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
    kill "${pid}" >/dev/null 2>&1 || true
    log "Stopped pid ${pid}"
  fi
}

if [[ -f "${ROOT}/.run/pids" ]]; then
  while read -r pid; do
    stop_pid "${pid}"
  done < "${ROOT}/.run/pids"
  rm -f "${ROOT}/.run/pids"
fi
if [[ -f "${ROOT}/.run/kafka.pid" ]]; then
  stop_pid "$(cat "${ROOT}/.run/kafka.pid")"
  rm -f "${ROOT}/.run/kafka.pid"
fi

if command -v pgrep >/dev/null 2>&1; then
  while read -r pid; do
    [[ -z "${pid}" || "${pid}" == "$$" ]] && continue
    cmd="$(ps -p "${pid}" -o args= 2>/dev/null || true)"
    case "${cmd}" in
      *"${ROOT}"*|*"${TOOLS}"*|*"kafka.Kafka"*|*"kafka-server-start"*|*"redis-server"*)
        stop_pid "${pid}"
        ;;
    esac
  done < <(pgrep -f "apex-build|kafka.Kafka|kafka-server-start|redis-server" || true)
fi

if command -v lsof >/dev/null 2>&1; then
  for port in 6379 9092 5173 8080 8081 8082 8083 8084 8085 8185 8285 8086 8087 8761; do
    pids="$(lsof -nP -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
    for pid in ${pids}; do
      name="$(ps -p "${pid}" -o comm= 2>/dev/null || true)"
      case "${name}" in
        redis-server|java|node|npm) stop_pid "${pid}" ;;
      esac
    done
  done
fi

if command -v brew >/dev/null 2>&1; then
  brew services stop redis >/dev/null 2>&1 || true
fi

log "Apex Build, the shop, Redis, and Kafka are stopped. PostgreSQL was left running."
