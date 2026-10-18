#!/usr/bin/env bash
# Prints a snapshot of the local Kafka broker: cluster, topics, partitions,
# offsets, consumer lag, log directories, recent events, and the broker text log.
# Calls java with libs/* so the Windows kafka-*.bat classpath limit never applies.
# --watch refreshes the live sections. Recent events are printed on a single run.
set -u

WATCH=0
EVENTS=8
while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch) WATCH=1; shift ;;
    --events) EVENTS="${2:-8}"; shift 2 ;;
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

BOOTSTRAP="$(setting KAFKA_BOOTSTRAP_SERVERS localhost:9092)"
KAFKA_HOME="${KAFKA_HOME:-${HOME}/.apex-build/kafka}"
CP="${KAFKA_HOME}/libs/*"
LOG4J="${ROOT}/scripts/kafka/tools-log4j.properties"
HOST="${BOOTSTRAP%%:*}"
PORT="${BOOTSTRAP##*:}"

if [[ ! -f "${KAFKA_HOME}/libs/kafka-tools-3.9.0.jar" ]]; then
  echo "Kafka tools are not installed at ${KAFKA_HOME}. Run scripts/install-deps.sh first."
  exit 1
fi

broker_up() {
  if command -v nc >/dev/null 2>&1; then
    nc -z -G 2 "${HOST}" "${PORT}" >/dev/null 2>&1 && return 0
    nc -z -w 2 "${HOST}" "${PORT}" >/dev/null 2>&1 && return 0
  fi
  (echo >/dev/tcp/"${HOST}"/"${PORT}") >/dev/null 2>&1
}

if ! broker_up; then
  echo "Kafka is not accepting connections at ${BOOTSTRAP}."
  echo "Start the stack with scripts/run-all.sh, then run this again."
  exit 1
fi

kafka() {
  java -Xmx128m "-Dlog4j.configuration=file:${LOG4J}" -cp "${CP}" "$@"
}

show_kafka() {
  local include_events="$1"
  printf 'Apex Build  Kafka\n'
  printf 'bootstrap   %s\n' "${BOOTSTRAP}"
  printf 'time        %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"

  section "Cluster"
  kafka org.apache.kafka.tools.ClusterTool cluster-id --bootstrap-server "${BOOTSTRAP}" || true
  kafka org.apache.kafka.tools.MetadataQuorumCommand --bootstrap-server "${BOOTSTRAP}" describe --status || true

  section "Topics and partitions"
  local internal
  internal="$(kafka org.apache.kafka.tools.TopicCommand --bootstrap-server "${BOOTSTRAP}" --list 2>/dev/null | grep '^__' | tr '\n' ',' | sed 's/,$//' || true)"
  if [[ -n "${internal}" ]]; then
    echo "Internal topics: ${internal}"
  fi
  kafka org.apache.kafka.tools.TopicCommand --bootstrap-server "${BOOTSTRAP}" --describe 2>/dev/null \
    | awk '
      /Topic:[[:space:]]+__/ { skip=1; next }
      /Topic:[[:space:]]+/ { skip=0 }
      skip==0 { print }
    ' || true

  section "Offsets"
  local tmp earliest latest
  tmp="$(mktemp -d)"
  kafka org.apache.kafka.tools.GetOffsetShell --bootstrap-server "${BOOTSTRAP}" --exclude-internal-topics --time earliest 2>/dev/null \
    | awk -F: 'NF>=3 { n=split($0,a,":"); topic=a[1]; for (i=2;i<=n-2;i++) topic=topic ":" a[i]; print topic "|" a[n-1] "|" a[n] }' > "${tmp}/earliest"
  kafka org.apache.kafka.tools.GetOffsetShell --bootstrap-server "${BOOTSTRAP}" --exclude-internal-topics --time latest 2>/dev/null \
    | awk -F: 'NF>=3 { n=split($0,a,":"); topic=a[1]; for (i=2;i<=n-2;i++) topic=topic ":" a[i]; print topic "|" a[n-1] "|" a[n] }' > "${tmp}/latest"
  earliest="${tmp}/earliest"
  latest="${tmp}/latest"
  printf '%-32s %9s %10s %10s %10s\n' "TOPIC" "PARTITION" "EARLIEST" "LATEST" "MESSAGES"
  awk -F'|' '
    NR==FNR { start[$1 "|" $2]=$3; topic[$1 "|" $2]=$1; part[$1 "|" $2]=$2; next }
    { end[$1 "|" $2]=$3; topic[$1 "|" $2]=$1; part[$1 "|" $2]=$2 }
    END {
      for (k in start) seen[k]=1
      for (k in end) seen[k]=1
      empty=1
      for (k in seen) {
        empty=0
        s = (k in start ? start[k] : 0)
        e = (k in end ? end[k] : 0)
        c = e - s
        if (c < 0) c = 0
        printf "%s|%s|%d|%d|%d\n", topic[k], part[k], s, e, c
      }
      if (empty) print "NONE"
    }
  ' "${earliest}" "${latest}" | sort | awk -F'|' '
    $0=="NONE" { print "No user topics yet."; next }
    NF==5 { printf "%-32s %9s %10d %10d %10d\n", $1, $2, $3, $4, $5 }
  '

  section "Consumer groups"
  local groups
  groups="$(kafka org.apache.kafka.tools.consumer.group.ConsumerGroupCommand --bootstrap-server "${BOOTSTRAP}" --list 2>/dev/null | sed '/^$/d' || true)"
  if [[ -z "${groups}" ]]; then
    echo "No consumer groups."
  else
    kafka org.apache.kafka.tools.consumer.group.ConsumerGroupCommand --bootstrap-server "${BOOTSTRAP}" --describe --all-groups || true
  fi

  section "Partition logs"
  local json
  json="$(kafka org.apache.kafka.tools.LogDirsCommand --bootstrap-server "${BOOTSTRAP}" --describe 2>/dev/null | grep '^{' | tail -n 1 || true)"
  if [[ -z "${json}" ]]; then
    echo "No log directory report."
  else
    printf '%s\n' "${json}" | grep -o '"logDir":"[^"]*"' | head -n 1 | sed 's/"logDir":"//; s/"$//' | awk '{ print "dir " $0 }'
    printf '%-40s %12s %10s\n' "PARTITION" "BYTES" "OFFSET LAG"
    printf '%s\n' "${json}" | grep -oE '"partition":"[^"]+","size":[0-9]+,"offsetLag":-?[0-9]+' \
      | while IFS= read -r row; do
          part="$(printf '%s' "${row}" | sed -n 's/.*"partition":"\([^"]*\)".*/\1/p')"
          case "${part}" in
            __*) continue ;;
          esac
          size="$(printf '%s' "${row}" | sed -n 's/.*"size":\([0-9]*\).*/\1/p')"
          lag="$(printf '%s' "${row}" | sed -n 's/.*"offsetLag":\(-\?[0-9]*\).*/\1/p')"
          printf '%-40s %12s %10s\n' "${part}" "${size}" "${lag}"
        done
  fi

  section "Broker text log"
  if [[ -f "${ROOT}/logs/kafka.log" ]]; then
    tail -n 12 "${ROOT}/logs/kafka.log"
  else
    echo "logs/kafka.log is not there yet."
  fi

  if [[ "${include_events}" == "1" ]]; then
    section "Recent events"
    local shown=0 topic partition end start from
    while IFS='|' read -r topic partition end; do
      [[ -n "${topic}" ]] || continue
      start="$(awk -F'|' -v t="${topic}" -v p="${partition}" '$1==t && $2==p { print $3 }' "${earliest}")"
      [[ -n "${start}" ]] || start=0
      if [[ "${end}" -le "${start}" ]]; then
        continue
      fi
      from=$((end - EVENTS))
      if [[ "${from}" -lt "${start}" ]]; then
        from="${start}"
      fi
      shown=1
      printf '\n%s  partition %s  from offset %s\n' "${topic}" "${partition}" "${from}"
      kafka org.apache.kafka.tools.consumer.ConsoleConsumer \
        --bootstrap-server "${BOOTSTRAP}" \
        --topic "${topic}" \
        --partition "${partition}" \
        --offset "${from}" \
        --max-messages "$((end - from))" \
        --timeout-ms 4000 \
        --property print.timestamp=true \
        --property print.key=true \
        --property print.partition=true \
        --property print.offset=true || true
    done < "${latest}"
    if [[ "${shown}" == "0" ]]; then
      echo "No events stored."
    fi
  fi
  rm -rf "${tmp}"
}

if [[ "${WATCH}" == "1" ]]; then
  while true; do
    clear || true
    show_kafka 0
    printf '\nRefreshing every 5s. Ctrl+C to stop. Run without --watch to print recent events.\n'
    sleep 5
  done
else
  show_kafka 1
fi
