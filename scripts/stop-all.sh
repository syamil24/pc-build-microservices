#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "${ROOT}/.run/pids" ]]; then
  while read -r pid; do
    kill "${pid}" >/dev/null 2>&1 || true
  done < "${ROOT}/.run/pids"
  rm -f "${ROOT}/.run/pids"
fi
if [[ -f "${ROOT}/.run/kafka.pid" ]]; then
  kill "$(cat "${ROOT}/.run/kafka.pid")" >/dev/null 2>&1 || true
  rm -f "${ROOT}/.run/kafka.pid"
fi
echo "Stopped Apex Build processes listed in .run"
