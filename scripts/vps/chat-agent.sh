#!/usr/bin/env bash
# Long-running Telegram chat. The health loop in monitor.sh does not poll Telegram.
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
ROOT="$(vps_root)"
cd "${ROOT}"
vps_load_env "${ROOT}"
if [[ -z "${HOME:-}" ]]; then
  HOME="$(getent passwd "$(id -un)" | cut -d: -f6)"
  export HOME
fi
VENV="${HOME}/.apex-heal/chat-venv"
if [[ ! -x "${VENV}/bin/python" ]]; then
  python3 -m venv "${VENV}"
fi
"${VENV}/bin/pip" install -q -r "${ROOT}/scripts/vps/chat_agent/requirements.txt"
export APEX_ROOT="${ROOT}"
export APEX_HEAL_DIR="${HOME}/.apex-heal"
export PYTHONPATH="${ROOT}/scripts/vps${PYTHONPATH:+:${PYTHONPATH}}"
exec "${VENV}/bin/python" -m chat_agent
