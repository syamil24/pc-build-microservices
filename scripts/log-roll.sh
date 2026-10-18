#!/usr/bin/env bash
# Moves finished logs into logs/archive and deletes archives older than 90 days.
# The file being written today stays in the logs folder. --watch repeats this
# every few minutes. --directory is for tests.
set -u

WATCH=0
DIRECTORY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch) WATCH=1; shift ;;
    --directory) DIRECTORY="${2:-}"; shift 2 ;;
    *) shift ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RETENTION_DAYS=90

file_day() {
  if stat -f %Sm "$1" >/dev/null 2>&1; then
    stat -f %Sm -t %Y-%m-%d "$1"
  else
    stat -c %y "$1" | cut -d' ' -f1
  fi
}

cutoff_day() {
  if date -v-"${RETENTION_DAYS}"d +%Y-%m-%d >/dev/null 2>&1; then
    date -v-"${RETENTION_DAYS}"d +%Y-%m-%d
  else
    date -d "${RETENTION_DAYS} days ago" +%Y-%m-%d
  fi
}

file_busy() {
  local name
  name="$(basename "$1")"
  # log4j already closed these. Nothing is writing them.
  if [[ "${name}" =~ \.log\.[0-9]{4}-[0-9]{2}-[0-9]{2} ]]; then
    return 1
  fi
  if ! command -v lsof >/dev/null 2>&1; then
    case "${name}" in
      *.err.log|redis.log|minio.log|keycloak.log|webapp.log|run-all.log) return 1 ;;
      *) return 0 ;;
    esac
  fi
  if lsof "${1}" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

move_into_archive() {
  local src="$1" dest="$2"
  [[ -e "${dest}" ]] && return 0
  if file_busy "${src}"; then
    return 0
  fi
  mv "${src}" "${dest}" 2>/dev/null || true
}

remove_expired() {
  local archive="$1" cutoff name day path
  [[ -d "${archive}" ]] || return 0
  cutoff="$(cutoff_day)"
  find "${archive}" -type f 2>/dev/null | while read -r path; do
    name="$(basename "${path}")"
    day=""
    if [[ "${name}" =~ ([0-9]{4}-[0-9]{2}-[0-9]{2}) ]]; then
      day="${BASH_REMATCH[1]}"
    else
      day="$(file_day "${path}")"
    fi
    if [[ -n "${day}" && "${day}" < "${cutoff}" ]]; then
      rm -f "${path}"
    fi
  done
}

roll_folder() {
  local dir="$1" archive="$2" kind="${3:-}" path name written today dest base date hour
  mkdir -p "${dir}" "${archive}"
  today="$(date +%Y-%m-%d)"
  find "${dir}" -maxdepth 1 -type f 2>/dev/null | while read -r path; do
    name="$(basename "${path}")"
    if [[ "${kind}" == "tool" && ! "${name}" =~ ^(install|pump-.+)\.log$ ]]; then
      continue
    fi
    if [[ "${name}" =~ ^(.+)\.log\.([0-9]{4}-[0-9]{2}-[0-9]{2})(-([0-9]{2}))?$ ]]; then
      base="${BASH_REMATCH[1]}"
      date="${BASH_REMATCH[2]}"
      hour="${BASH_REMATCH[4]:-}"
      if [[ -n "${hour}" ]]; then
        dest="${archive}/${base}.${date}-${hour}.log"
      else
        dest="${archive}/${base}.${date}.log"
      fi
      move_into_archive "${path}" "${dest}"
      continue
    fi
    [[ "${name}" == *.log ]] || continue
    written="$(file_day "${path}")"
    [[ "${written}" < "${today}" ]] || continue
    base="${name%.log}"
    move_into_archive "${path}" "${archive}/${base}.${written}.log"
  done
  remove_expired "${archive}"
}

invoke_roll() {
  if [[ -n "${DIRECTORY}" ]]; then
    roll_folder "${DIRECTORY}" "${DIRECTORY}/archive"
    return
  fi
  roll_folder "${ROOT}/logs" "${ROOT}/logs/archive"
  if [[ -d "${HOME}/.apex-build" ]]; then
    roll_folder "${HOME}/.apex-build" "${HOME}/.apex-build/log-archive" tool
  fi
}

invoke_roll
if [[ "${WATCH}" == "1" ]]; then
  while true; do
    sleep 300
    invoke_roll || true
  done
fi
