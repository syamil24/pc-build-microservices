#!/usr/bin/env bash
# Starts Redis, Kafka, every fat jar, and the webapp.
# Memory defaults are sized for an 8GB Apple Silicon laptop.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"
mkdir -p logs .run
LOG="logs/run-all.log"
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*" | tee -a "${LOG}"; }
on_err() { log "ERROR at line $1: $2"; exit 1; }
trap 'on_err "$LINENO" "$BASH_COMMAND"' ERR

if [[ ! -f .env ]]; then
  cp .env.example .env
  log "Created .env from .env.example"
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

rand() { openssl rand -base64 48 | tr -d '\n' | tr '+/' 'AB'; }
changed=0
if [[ -z "${JWT_SECRET:-}" ]]; then JWT_SECRET="$(rand)"; changed=1; fi
if [[ -z "${INTERNAL_SERVICE_TOKEN:-}" ]]; then INTERNAL_SERVICE_TOKEN="$(rand)"; changed=1; fi
if [[ -z "${DEMO_ADMIN_PASSWORD:-}" ]]; then DEMO_ADMIN_PASSWORD="Admin-$(openssl rand -hex 4)"; changed=1; fi
if [[ -z "${DEMO_CUSTOMER_PASSWORD:-}" ]]; then DEMO_CUSTOMER_PASSWORD="Customer-$(openssl rand -hex 4)"; changed=1; fi
if [[ -z "${KEYCLOAK_ADMIN:-}" ]]; then KEYCLOAK_ADMIN="admin"; changed=1; fi
if [[ -z "${KEYCLOAK_ADMIN_PASSWORD:-}" ]]; then KEYCLOAK_ADMIN_PASSWORD="Keycloak-$(openssl rand -hex 16)"; changed=1; fi
if [[ -z "${KEYCLOAK_URL:-}" ]]; then KEYCLOAK_URL="http://localhost:8180"; changed=1; fi
if [[ -z "${KEYCLOAK_ISSUER:-}" ]]; then KEYCLOAK_ISSUER="http://localhost:8180/realms/apex"; changed=1; fi
if [[ -z "${MINIO_ROOT_USER:-}" ]]; then MINIO_ROOT_USER="apex"; changed=1; fi
if [[ -z "${MINIO_ROOT_PASSWORD:-}" ]]; then MINIO_ROOT_PASSWORD="Minio-$(openssl rand -hex 16)"; changed=1; fi
if [[ "${changed}" == "1" ]]; then
  awk -v jwt="${JWT_SECRET}" -v token="${INTERNAL_SERVICE_TOKEN}" -v admin="${DEMO_ADMIN_PASSWORD}" -v customer="${DEMO_CUSTOMER_PASSWORD}" -v user="${MINIO_ROOT_USER}" -v pass="${MINIO_ROOT_PASSWORD}" -v kcadmin="${KEYCLOAK_ADMIN}" -v kcpass="${KEYCLOAK_ADMIN_PASSWORD}" -v kcurl="${KEYCLOAK_URL}" -v kcissuer="${KEYCLOAK_ISSUER}" '
    BEGIN { j=0; t=0; a=0; c=0; u=0; p=0; ka=0; kp=0; ku=0; ki=0 }
    /^JWT_SECRET=/ { print "JWT_SECRET=" jwt; j=1; next }
    /^INTERNAL_SERVICE_TOKEN=/ { print "INTERNAL_SERVICE_TOKEN=" token; t=1; next }
    /^DEMO_ADMIN_PASSWORD=/ { print "DEMO_ADMIN_PASSWORD=" admin; a=1; next }
    /^DEMO_CUSTOMER_PASSWORD=/ { print "DEMO_CUSTOMER_PASSWORD=" customer; c=1; next }
    /^KEYCLOAK_ADMIN=/ { print "KEYCLOAK_ADMIN=" kcadmin; ka=1; next }
    /^KEYCLOAK_ADMIN_PASSWORD=/ { print "KEYCLOAK_ADMIN_PASSWORD=" kcpass; kp=1; next }
    /^KEYCLOAK_URL=/ { print "KEYCLOAK_URL=" kcurl; ku=1; next }
    /^KEYCLOAK_ISSUER=/ { print "KEYCLOAK_ISSUER=" kcissuer; ki=1; next }
    /^MINIO_ROOT_USER=/ { print "MINIO_ROOT_USER=" user; u=1; next }
    /^MINIO_ROOT_PASSWORD=/ { print "MINIO_ROOT_PASSWORD=" pass; p=1; next }
    { print }
    END {
      if (!ka) print "KEYCLOAK_ADMIN=" kcadmin
      if (!kp) print "KEYCLOAK_ADMIN_PASSWORD=" kcpass
      if (!ku) print "KEYCLOAK_URL=" kcurl
      if (!ki) print "KEYCLOAK_ISSUER=" kcissuer
      if (!u) print "MINIO_ROOT_USER=" user
      if (!p) print "MINIO_ROOT_PASSWORD=" pass
    }
  ' .env > .env.tmp && mv .env.tmp .env
  set -a; source .env; set +a
  log "Generated local secrets in .env (not committed)"
fi
if [[ -z "${DB_PASSWORD:-}" ]]; then
  log "ERROR: set DB_PASSWORD in .env to the local PostgreSQL password, then rerun."
  exit 1
fi
export JWT_SECRET INTERNAL_SERVICE_TOKEN DEMO_ADMIN_PASSWORD DEMO_CUSTOMER_PASSWORD DB_PASSWORD
export PGPASSWORD="${DB_PASSWORD}"

bash scripts/init-db.sh

# Small heaps. Override with APEX_JVM_PROFILE=full on a larger machine.
if [[ "${APEX_JVM_PROFILE:-demo}" == "full" ]]; then
  JVM="-Xms128m -Xmx512m"
else
  JVM="-Xms64m -Xmx256m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:MaxMetaspaceSize=192m -Xss256k"
fi

port_open() {
  if command -v nc >/dev/null 2>&1; then
    nc -z localhost "$1" >/dev/null 2>&1
  else
    (echo >/dev/tcp/127.0.0.1/"$1") >/dev/null 2>&1
  fi
}

start_minio() {
  local port="${MINIO_API_PORT:-9000}"
  local console="${MINIO_CONSOLE_PORT:-9001}"
  local home="${HOME}/.apex-build/minio"
  local bin="${home}/minio"
  if port_open "${port}"; then
    log "MinIO is already up"
    return
  fi
  if [[ ! -x "${bin}" ]]; then
    log "ERROR: MinIO is missing. Run scripts/install-deps.sh"
    exit 1
  fi
  mkdir -p "${HOME}/.apex-build/minio-data" logs
  log "Starting MinIO"
  MINIO_ROOT_USER="${MINIO_ROOT_USER}" MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD}" \
    "${bin}" server "${HOME}/.apex-build/minio-data" --address "127.0.0.1:${port}" --console-address "127.0.0.1:${console}" \
    >>logs/minio.log 2>&1 &
  echo $! >> .run/pids
  local i
  for i in $(seq 1 20); do
    if port_open "${port}"; then
      return
    fi
    sleep 1
  done
  log "ERROR: MinIO did not start. See logs/minio.log"
  exit 1
}

start_redis() {
  if command -v redis-cli >/dev/null 2>&1 && redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" ping >/dev/null 2>&1; then
    log "Redis is already up"
    return
  fi
  log "Starting Redis"
  if command -v redis-server >/dev/null 2>&1; then
    redis-server --daemonize yes --port "${REDIS_PORT:-6379}" --maxmemory 64mb --maxmemory-policy allkeys-lru --bind 127.0.0.1 --protected-mode yes \
      >>logs/redis.log 2>&1 || true
  elif command -v brew >/dev/null 2>&1; then
    brew services start redis >>logs/redis.log 2>&1 || true
  fi
  sleep 1
  redis-cli -p "${REDIS_PORT:-6379}" ping >>logs/redis.log 2>&1
}

start_kafka() {
  if port_open 9092; then
    log "Kafka is already listening on 9092"
    return
  fi
  KAFKA_HOME="${KAFKA_HOME:-${HOME}/.apex-build/kafka}"
  if [[ ! -x "${KAFKA_HOME}/bin/kafka-server-start.sh" ]]; then
    log "ERROR: Kafka is not installed. Run scripts/install-deps.sh"
    exit 1
  fi
  CFG="${ROOT}/.run/kafka-server.properties"
  cat > "${CFG}" <<EOF
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093
listeners=PLAINTEXT://localhost:9092,CONTROLLER://localhost:9093
advertised.listeners=PLAINTEXT://localhost:9092
controller.listener.names=CONTROLLER
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
inter.broker.listener.name=PLAINTEXT
log.dirs=${ROOT}/.run/kafka-logs
num.partitions=3
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1
auto.create.topics.enable=true
log.retention.hours=24
EOF
  log "Starting Kafka (heap capped at 256m)"
  if [[ ! -f "${ROOT}/.run/kafka-logs/meta.properties" ]]; then
    mkdir -p "${ROOT}/.run/kafka-logs"
    CLUSTER_ID="$("${KAFKA_HOME}/bin/kafka-storage.sh" random-uuid)"
    "${KAFKA_HOME}/bin/kafka-storage.sh" format -t "${CLUSTER_ID}" -c "${CFG}" >>logs/kafka.log 2>&1
  fi
  export KAFKA_HEAP_OPTS="-Xms128m -Xmx256m"
  nohup "${KAFKA_HOME}/bin/kafka-server-start.sh" "${CFG}" >>logs/kafka.log 2>&1 &
  echo $! > .run/kafka.pid
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    port_open 9092 && return
    sleep 2
  done
  log "ERROR: Kafka did not open port 9092. See logs/kafka.log"
  exit 1
}

start_jar() {
  local name="$1" jar="$2"
  shift 2
  log "Starting ${name}"
  # shellcheck disable=SC2086
  nohup java ${JVM} -jar "${jar}" "$@" >>"logs/${name}.log" 2>&1 &
  echo $! >> .run/pids
}

wait_health() {
  local port="$1" name="$2"
  for _ in $(seq 1 40); do
    if curl -fsS "http://127.0.0.1:${port}/actuator/health" >/dev/null 2>&1; then
      log "${name} is healthy on ${port}"
      return
    fi
    sleep 2
  done
  log "ERROR: ${name} did not become healthy. See logs/${name}.log"
  exit 1
}

: > .run/pids
start_keycloak() {
  local home bin
  bash scripts/install-keycloak.sh
  home="$(tr -d '\r' < .run/keycloak-home.txt)"
  bin="${home}/bin/kc.sh"
  if port_open 8180; then
    log "Keycloak is already up"
  else
    log "Starting Keycloak"
    mkdir -p logs
    KC_BOOTSTRAP_ADMIN_USERNAME="${KEYCLOAK_ADMIN}" KC_BOOTSTRAP_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD}" \
      KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN}" KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD}" \
      "${bin}" start-dev --http-port=8180 --http-management-port=9002 \
      --db=postgres \
      --db-url="jdbc:postgresql://${DB_HOST:-localhost}:${DB_PORT:-5432}/apex_keycloak" \
      --db-username="${DB_USERNAME:-postgres}" \
      --db-password="${DB_PASSWORD}" >>logs/keycloak.log 2>&1 &
    echo $! >> .run/pids
    local i
    for i in $(seq 1 40); do
      if curl -fsS "http://127.0.0.1:8180/realms/master" >/dev/null 2>&1; then
        break
      fi
      if [[ "${i}" == "40" ]]; then
        log "ERROR: Keycloak did not start. See logs/keycloak.log"
        exit 1
      fi
      sleep 2
    done
  fi
  bash scripts/setup-keycloak.sh
}

start_redis
start_kafka
start_minio
start_keycloak

if [[ "${1:-}" != "--no-build" ]]; then
  log "Packaging fat jars"
  mvn -B -DskipTests package
fi

start_jar discovery-service services/discovery-service/target/discovery-service-1.0.0.jar
wait_health 8761 discovery-service

start_jar cache-service services/cache-service/target/cache-service-1.0.0.jar
start_jar auth-service services/auth-service/target/auth-service-1.0.0.jar
start_jar user-service services/user-service/target/user-service-1.0.0.jar
start_jar inventory-service services/inventory-service/target/inventory-service-1.0.0.jar
start_jar order-service services/order-service/target/order-service-1.0.0.jar
start_jar shipping-service services/shipping-service/target/shipping-service-1.0.0.jar
start_jar report-service services/report-service/target/report-service-1.0.0.jar
start_jar payment-1 services/payment-service/target/payment-service-1.0.0.jar --server.port=8085 --apex.instance-id=payment-1 --eureka.instance.instance-id=payment-1
wait_health 8087 cache-service
wait_health 8085 payment-1
wait_health 8088 report-service
start_jar payment-2 services/payment-service/target/payment-service-1.0.0.jar --server.port=8185 --apex.instance-id=payment-2 --eureka.instance.instance-id=payment-2
start_jar payment-3 services/payment-service/target/payment-service-1.0.0.jar --server.port=8285 --apex.instance-id=payment-3 --eureka.instance.instance-id=payment-3
start_jar gateway-service services/gateway-service/target/gateway-service-1.0.0.jar
wait_health 8080 gateway-service

if [[ ! -d webapp/node_modules ]]; then
  log "Installing webapp dependencies"
  (cd webapp && npm install)
fi
log "Starting webapp on http://localhost:5173"
(cd webapp && nohup npm run dev >>../logs/webapp.log 2>&1 & echo $! >> ../.run/pids)

log "Apex Build is up."
log "Shop:      http://localhost:5173"
log "Gateway:   http://localhost:8080"
log "Eureka:    http://localhost:8761"
log "Stop with: ./scripts/stop-all.sh"
