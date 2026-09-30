#!/usr/bin/env bash
# Raises a drill incident. The monitor decides nothing until you reply, then stores the skill.
set -Eeuo pipefail
kind="${1:-}"
net=()
if docker network inspect apex_default >/dev/null 2>&1; then
  net=(--network apex_default)
fi
case "${kind}" in
  cpu)
    docker rm -f apex-sim-cpu >/dev/null 2>&1 || true
    docker run -d --name apex-sim-cpu "${net[@]}" alpine sh -c 'while true; do :; done'
    ;;
  memory)
    docker rm -f apex-sim-memory >/dev/null 2>&1 || true
    docker run -d --name apex-sim-memory alpine sh -c 'dd if=/dev/zero of=/tmp/fill bs=1M count=512; sleep 3600'
    ;;
  oom)
    docker rm -f apex-sim-oom >/dev/null 2>&1 || true
    docker run -d --name apex-sim-oom --memory 64m python:3-alpine python -c 'a=[]
while True:
    a.append("x"*1000000)'
    ;;
  exception)
    docker rm -f apex-sim-exception >/dev/null 2>&1 || true
    docker run -d --name apex-sim-exception alpine sh -c 'echo "ERROR java.lang.IllegalStateException: simulated critical failure"; sleep 3600'
    ;;
  *)
    echo "Usage: bash scripts/vps/simulate-disaster.sh cpu|memory|oom|exception" >&2
    exit 2
    ;;
esac
echo "Started apex-sim-${kind}. The monitor will ask on Telegram."
