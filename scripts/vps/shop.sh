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
  APEX_DETACH=1 bash scripts/run-all.sh --no-build
}

load_runtime_env() {
  if [[ -f "${ROOT}/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT}/.env"
    set +a
  fi
  if [[ -f "${HOME}/.apex-heal/heaps.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${HOME}/.apex-heal/heaps.env"
    set +a
  fi
}

# jar|port|extra args. Payment instances share one module and differ by port.
service_spec() {
  case "$1" in
    discovery-service) printf '%s' "services/discovery-service/target/discovery-service-1.0.0.jar|8761|" ;;
    cache-service) printf '%s' "services/cache-service/target/cache-service-1.0.0.jar|8087|" ;;
    auth-service) printf '%s' "services/auth-service/target/auth-service-1.0.0.jar|8081|" ;;
    user-service) printf '%s' "services/user-service/target/user-service-1.0.0.jar|8082|" ;;
    inventory-service) printf '%s' "services/inventory-service/target/inventory-service-1.0.0.jar|8083|" ;;
    order-service) printf '%s' "services/order-service/target/order-service-1.0.0.jar|8084|" ;;
    shipping-service) printf '%s' "services/shipping-service/target/shipping-service-1.0.0.jar|8086|" ;;
    report-service) printf '%s' "services/report-service/target/report-service-1.0.0.jar|8088|" ;;
    gateway-service) printf '%s' "services/gateway-service/target/gateway-service-1.0.0.jar|8080|" ;;
    payment-1) printf '%s' "services/payment-service/target/payment-service-1.0.0.jar|8085|--server.port=8085 --apex.instance-id=payment-1 --eureka.instance.instance-id=payment-1" ;;
    payment-2) printf '%s' "services/payment-service/target/payment-service-1.0.0.jar|8185|--server.port=8185 --apex.instance-id=payment-2 --eureka.instance.instance-id=payment-2" ;;
    payment-3) printf '%s' "services/payment-service/target/payment-service-1.0.0.jar|8285|--server.port=8285 --apex.instance-id=payment-3 --eureka.instance.instance-id=payment-3" ;;
    *) return 1 ;;
  esac
}

restart_one() {
  local name="$1" spec jar port extra opts key
  spec="$(service_spec "${name}")" || {
    echo "Unknown service ${name}" >&2
    return 2
  }
  jar="${spec%%|*}"
  spec="${spec#*|}"
  port="${spec%%|*}"
  extra="${spec#*|}"
  if [[ ! -f "${ROOT}/${jar}" ]]; then
    echo "Missing jar ${jar}. Package the module before restarting ${name}." >&2
    return 1
  fi
  pkill -f "LOG_NAME=${name}" || true
  sleep 1
  opts="-Xms64m -Xmx256m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:MaxMetaspaceSize=192m -Xss256k"
  key="$(printf '%s' "${name}" | tr '[:lower:]' '[:upper:]' | tr '-' '_')"
  key="${key}_JAVA_OPTS"
  if [[ -n "${!key:-}" ]]; then
    opts="${!key}"
  fi
  mkdir -p "${ROOT}/logs" "${ROOT}/.run"
  # shellcheck disable=SC2086
  setsid nohup java ${opts} -DLOG_NAME="${name}" -jar "${ROOT}/${jar}" ${extra} >/dev/null 2>>"${ROOT}/logs/${name}.err.log" </dev/null &
  echo $! >> "${ROOT}/.run/pids"
  local _
  for _ in $(seq 1 40); do
    if curl -fsS "http://127.0.0.1:${port}/actuator/health" >/dev/null 2>&1; then
      echo "${name} is healthy on ${port}"
      return 0
    fi
    sleep 2
  done
  echo "ERROR: ${name} did not become healthy. See logs/${name}.log and logs/${name}.err.log" >&2
  return 1
}

restart_named() {
  local name="$1"
  load_runtime_env
  if [[ "${name}" == "payment" || "${name}" == "payment-service" ]]; then
    restart_one payment-1
    restart_one payment-2
    restart_one payment-3
    return 0
  fi
  restart_one "${name}"
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
  restart)
    if [[ -z "${name}" ]]; then
      echo "restart needs a service name" >&2
      exit 2
    fi
    restart_named "${name}"
    ;;
  *)
    echo "Usage: bash scripts/vps/shop.sh redeploy|stop <name>|logs <name>|restart <name>" >&2
    exit 2
    ;;
esac
