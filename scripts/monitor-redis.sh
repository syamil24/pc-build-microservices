#!/usr/bin/env bash
# Prints a snapshot of the local Redis: server, memory, hit rate, and the first 100 keys with their values.
# --watch refreshes the same view every 5 seconds.
set -u

WATCH=0
LIMIT=100
while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch) WATCH=1; shift ;;
    --limit) LIMIT="${2:-80}"; shift 2 ;;
    *) shift ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

setting() {
  local name="$1" fallback="$2" line
  if [[ -n "${!name:-}" ]]; then
    printf '%s' "${!name}"
    return
  fi
  if [[ -f "${ROOT}/.env" ]]; then
    line="$(grep -E "^${name}=" "${ROOT}/.env" 2>/dev/null | tail -n 1 | cut -d= -f2- | tr -d '\r')"
    if [[ -n "${line}" ]]; then
      printf '%s' "${line}"
      return
    fi
  fi
  printf '%s' "${fallback}"
}

section() {
  printf '\n%s\n%s\n%s\n' "========================================================================" "$1" "========================================================================"
}

if [[ -n "${REDIS_CLI:-}" && -x "${REDIS_CLI}" ]]; then
  CLI="${REDIS_CLI}"
elif [[ -x "${HOME}/.apex-build/redis/redis-cli" ]]; then
  CLI="${HOME}/.apex-build/redis/redis-cli"
elif command -v redis-cli >/dev/null 2>&1; then
  CLI="$(command -v redis-cli)"
else
  echo "redis-cli was not found. Run scripts/install-deps.sh first."
  exit 1
fi

HOST="$(setting REDIS_HOST localhost)"
PORT="$(setting REDIS_PORT 6379)"

redis() {
  "${CLI}" -h "${HOST}" -p "${PORT}" --raw "$@"
}

if [[ "$(redis PING 2>/dev/null | tail -n 1)" != "PONG" ]]; then
  echo "Redis is not accepting connections at ${HOST}:${PORT}."
  echo "Start the stack with scripts/run-all.sh, then run this again."
  exit 1
fi

field() {
  local section_name="$1" name="$2" value
  value="$(redis INFO "${section_name}" | awk -F: -v n="${name}" '$1==n { print $2; exit }')"
  if [[ -z "${value}" ]]; then
    value="-"
  fi
  printf '%-28s %s\n' "$3" "${value}"
}

show_redis() {
  local dbsize
  dbsize="$(redis DBSIZE | tail -n 1)"
  printf 'Apex Build  Redis\n'
  printf 'address     %s:%s\n' "${HOST}" "${PORT}"
  printf 'time        %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"

  section "Server"
  field server redis_version "version"
  field server redis_mode "mode"
  field server uptime_in_seconds "uptime seconds"
  field clients connected_clients "connected clients"
  printf '%-28s %s\n' "keys" "${dbsize}"

  section "Memory"
  field memory used_memory_human "used"
  field memory used_memory_peak_human "peak"
  field memory maxmemory_human "max"
  field memory maxmemory_policy "policy"
  field memory mem_fragmentation_ratio "fragmentation"
  field stats evicted_keys "evicted keys"
  field stats expired_keys "expired keys"

  section "Traffic"
  field stats total_commands_processed "commands"
  field stats instantaneous_ops_per_sec "ops/sec"
  field stats keyspace_hits "hits"
  field stats keyspace_misses "misses"
  redis INFO keyspace | awk -F: '/^db/ { printf "%-28s %s\n", $1, $2 }'

  section "Keys and values"
  local count shown key type ttl bytes value cursor reply keys_file
  keys_file="$(mktemp)"
  cursor=0
  local spins=0
  while [[ "${spins}" -lt 50 ]]; do
    spins=$((spins + 1))
    reply="$(redis SCAN "${cursor}" MATCH '*' COUNT 200)"
    cursor="$(printf '%s\n' "${reply}" | head -n 1 | tr -d '\r')"
    printf '%s\n' "${reply}" | tail -n +2 | tr -d '\r' >> "${keys_file}"
    [[ -z "${cursor}" || "${cursor}" == "0" ]] && break
  done
  count="$(sed '/^$/d' "${keys_file}" | sort -u | wc -l | tr -d ' ')"
  if [[ "${count}" == "0" ]]; then
    echo "No keys."
    rm -f "${keys_file}"
    return
  fi
  shown=0
  printf 'first %s of %s keys\n' "$( [ "${count}" -lt "${LIMIT}" ] && printf '%s' "${count}" || printf '%s' "${LIMIT}" )" "${count}"
  sed '/^$/d' "${keys_file}" | sort -u | while IFS= read -r key; do
    shown=$((shown + 1))
    if [[ "${shown}" -gt "${LIMIT}" ]]; then
      break
    fi
    type="$(redis TYPE "${key}" | tail -n 1 | tr -d '\r')"
    ttl="$(redis TTL "${key}" | tail -n 1 | tr -d '\r')"
    if [[ "${ttl}" == "-1" ]]; then
      ttl="none"
    fi
    bytes="$(redis MEMORY USAGE "${key}" | tail -n 1 | tr -d '\r')"
    case "${type}" in
      string) value="$(redis GET "${key}")" ;;
      hash) value="$(redis HGETALL "${key}")" ;;
      list) value="$(redis LRANGE "${key}" 0 20)" ;;
      set) value="$(redis SMEMBERS "${key}" | head -n 20)" ;;
      zset) value="$(redis ZRANGE "${key}" 0 20 WITHSCORES)" ;;
      *) value="" ;;
    esac
    value="$(printf '%s' "${value}" | tr '\n' ' ' | tr -s ' ' | tr -d '\r')"
    if [[ -z "${value}" ]]; then
      value="(empty)"
    elif [[ "${#value}" -gt 500 ]]; then
      value="${value:0:500}..."
    fi
    printf '\n[%s] %s\n' "${shown}" "${key}"
    printf '    %s   ttl %s   %s bytes\n' "${type}" "${ttl}" "${bytes}"
    printf '    %s\n' "${value}"
  done
  rm -f "${keys_file}"
}

if [[ "${WATCH}" == "1" ]]; then
  while true; do
    clear || true
    show_redis
    printf '\nRefreshing every 5s. Ctrl+C to stop.\n'
    sleep 5
  done
else
  show_redis
fi
