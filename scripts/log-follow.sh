#!/usr/bin/env bash
# Runs a tool and writes its output to logs/<name>.log.
# At midnight the file is moved to logs/archive/<name>.yyyy-MM-dd.log and a new day starts.
# Usage: log-follow.sh <name> [--cwd dir] -- command [args...]
set -u

name="${1:-}"
shift || true
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ "${1:-}" == "--cwd" ]]; then
  cd "${2:?}" || exit 1
  shift 2
fi
if [[ "${1:-}" == "--" ]]; then
  shift
fi
if [[ -z "${name}" || $# -lt 1 ]]; then
  echo "usage: log-follow.sh <name> [--cwd dir] -- command [args...]" >&2
  exit 1
fi

logs="${ROOT}/logs"
archive="${logs}/archive"
mkdir -p "${logs}" "${archive}"
active="${logs}/${name}.log"

file_day() {
  if stat -f %Sm "$1" >/dev/null 2>&1; then
    stat -f %Sm -t %Y-%m-%d "$1"
  else
    stat -c %y "$1" | cut -d' ' -f1
  fi
}

if [[ -f "${active}" ]]; then
  written="$(file_day "${active}")"
  today="$(date +%Y-%m-%d)"
  if [[ "${written}" < "${today}" ]]; then
    dest="${archive}/${name}.${written}.log"
    if [[ ! -e "${dest}" ]]; then
      mv "${active}" "${dest}"
    fi
  fi
fi

fifo="$(mktemp -u "${TMPDIR:-/tmp}/apex-log.XXXXXX")"
mkfifo "${fifo}"
cleanup() {
  if [[ -n "${child:-}" ]]; then
    kill "${child}" >/dev/null 2>&1 || true
  fi
  rm -f "${fifo}"
}
trap cleanup EXIT INT TERM

"$@" >"${fifo}" 2>&1 &
child=$!
day="$(date +%Y-%m-%d)"
while IFS= read -r line || [[ -n "${line}" ]]; do
  now="$(date +%Y-%m-%d)"
  if [[ "${now}" != "${day}" ]]; then
    dest="${archive}/${name}.${day}.log"
    if [[ -f "${active}" && ! -e "${dest}" ]]; then
      mv "${active}" "${dest}"
    fi
    day="${now}"
  fi
  printf '%s\n' "${line}" >> "${active}"
done < "${fifo}"
wait "${child}"
exit $?
