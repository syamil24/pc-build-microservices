#!/usr/bin/env bash
# Watches the Compose stack, asks Telegram, and runs a stored skill when one has recovered before.
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
ROOT="$(vps_root)"
cd "${ROOT}"
vps_load_env "${ROOT}"
HEAL="${HOME}/.apex-heal"
mkdir -p "${HEAL}/imported" "${HEAL}/pins"
export APEX_ROOT="${ROOT}"
export APEX_HEAL_DIR="${HEAL}"
PORTS=(8080 8081 8082 8083 8084 8085 8086 8087 8088 8761)
HIGH=0

refresh_skills() {
  local now file name url body hash pin
  now="$(date +%s)"
  file="${HEAL}/skills-refreshed"
  if [[ -f "${file}" ]] && [[ $((now - $(cat "${file}"))) -lt 86400 ]]; then
    return 0
  fi
  while read -r name url; do
    [[ -z "${name}" || "${name}" == \#* ]] && continue
    body="$(curl -fsSL "${url}" || true)"
    if [[ -z "${body}" ]]; then
      vps_log "Could not download ${name}"
      continue
    fi
    hash="$(printf '%s' "${body}" | sha256sum | awk '{print $1}')"
    pin="${HEAL}/pins/${name}.sha"
    if [[ -f "${pin}" && "$(cat "${pin}")" != "${hash}" ]]; then
      vps_telegram "Skill ${name} changed upstream and was not applied. Merge a pin update to accept it."
      continue
    fi
    printf '%s' "${body}" > "${HEAL}/imported/${name}.md"
    printf '%s' "${hash}" > "${pin}"
  done < "${ROOT}/scripts/vps/skill-sources.txt"
  printf '%s' "${now}" > "${file}"
}

host_pressure() {
  local mem="ok" cpu="ok"
  if [[ -r /proc/meminfo ]]; then
    mem="$(awk '/MemTotal/{t=$2} /MemAvailable/{a=$2} END {if (t>0 && a/t < 0.10) print "high-memory"; else print "ok"}' /proc/meminfo)"
  fi
  if [[ -r /proc/stat ]]; then
    local line idle total prev
    line="$(awk '/^cpu /{print $2+$3+$4+$5+$6+$7+$8, $5}' /proc/stat)"
    if [[ -f "${HEAL}/cpu.prev" ]]; then
      prev="$(cat "${HEAL}/cpu.prev")"
      cpu="$(awk -v a="${prev}" -v b="${line}" 'BEGIN {split(a,x," "); split(b,y," "); d=y[1]-x[1]; i=y[2]-x[2]; if (d>0 && (d-i)/d > 0.90) print "high-cpu"; else print "ok"}')"
    fi
    printf '%s' "${line}" > "${HEAL}/cpu.prev"
  fi
  if [[ "${mem}" != ok ]]; then echo "${mem}"; return; fi
  if [[ "${cpu}" != ok ]]; then echo "${cpu}"; return; fi
  echo ok
}

health_report() {
  local port code
  for port in "${PORTS[@]}"; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${port}/actuator/health" || true)"
    if [[ "${code}" != "200" ]]; then
      echo "health ${port} ${code}"
      return
    fi
  done
  echo ok
}

log_signal() {
  local name line
  docker ps --format '{{.Names}}' >/dev/null 2>&1 || { echo ok; return; }
  while read -r name; do
    [[ -z "${name}" ]] && continue
    line="$(docker logs --since 20s "${name}" 2>&1 | grep -E 'ERROR|Exception|OutOfMemoryError' | tail -n 1 || true)"
    if [[ -n "${line}" ]]; then
      echo "${name} ${line}"
      return
    fi
  done < <(docker ps --format '{{.Names}}')
  echo ok
}

open_incident() {
  local signal="$1"
  local key id report decision
  key="$(printf '%s' "${signal}" | sha256sum | awk '{print $1}')"
  if [[ -f "${HEAL}/cooldown/${key}" ]]; then
    local then now
    then="$(cat "${HEAL}/cooldown/${key}")"
    now="$(date +%s)"
    if [[ $((now - then)) -lt 600 ]]; then
      return 0
    fi
  fi
  mkdir -p "${HEAL}/cooldown"
  date +%s > "${HEAL}/cooldown/${key}"
  id="$(date +%Y%m%d%H%M%S)"
  report="$(health_report; docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' || true)"
  node -e 'const fs=require("fs"); fs.writeFileSync(process.argv[1], JSON.stringify({id:process.argv[2], signal:process.argv[3], service:""}))' \
    "${HEAL}/incident.json" "${id}" "${signal}"
  node "${ROOT}/scripts/vps/interpret.mjs" "${HEAL}/incident.json" > "${HEAL}/decision.json"
  if node -e 'const d=require("fs").readFileSync(process.argv[1],"utf8"); const j=JSON.parse(d); process.exit(j.matched && j.actions.length ? 0 : 1)' "${HEAL}/decision.json"; then
    if APEX_ROOT="${ROOT}" node "${ROOT}/scripts/vps/apply-actions.mjs" "${HEAL}/decision.json" confirmed; then
      if [[ "$(health_report)" == ok ]]; then
        vps_telegram "Reused a recovered skill for ${signal}. Health is back."
        return 0
      fi
    fi
    vps_telegram "A stored skill for ${signal} did not recover the shop. Reply with what to do."
  else
    vps_telegram "Incident ${id}: ${signal}"$'\n'"${report}"$'\n'"Reply with the action. Example: restart order-service"
  fi
  cp "${HEAL}/incident.json" "${HEAL}/open.json"
}

save_skill() {
  local signal="$1"
  node -e '
    const fs = require("fs");
    const heal = process.argv[1];
    const signal = process.argv[2];
    const decision = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
    const file = heal + "/skills.json";
    const skills = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
    const next = skills.filter((skill) => skill.signal !== signal);
    next.push({ signal, actions: decision.actions, recovered: true, reply: process.argv[4] || "" });
    fs.writeFileSync(file, JSON.stringify(next, null, 2));
  ' "${HEAL}" "${signal}" "${HEAL}/decision.json" "${2:-}"
}

poll_reply() {
  [[ -f "${HEAL}/open.json" ]] || return 0
  local offset=0
  [[ -f "${HEAL}/telegram.offset" ]] && offset="$(cat "${HEAL}/telegram.offset")"
  local polled
  polled="$(node "${ROOT}/scripts/vps/telegram-poll.mjs" "${offset}")"
  printf '%s' "$(printf '%s\n' "${polled}" | head -n 1)" > "${HEAL}/telegram.offset"
  local messages
  messages="$(printf '%s\n' "${polled}" | tail -n 1)"
  [[ "${messages}" == "[]" || -z "${messages}" ]] && return 0
  local text
  text="$(node -e 'const m=JSON.parse(process.argv[1]); process.stdout.write(m.length ? m[m.length-1].text : "")' "${messages}")"
  [[ -z "${text}" ]] && return 0
  local signal
  signal="$(node -e 'const i=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); process.stdout.write(i.signal || "")' "${HEAL}/open.json")"
  node "${ROOT}/scripts/vps/interpret.mjs" "${HEAL}/open.json" "${text}" > "${HEAL}/decision.json"
  local mode="pending"
  if printf '%s' "${text}" | grep -Eqi 'apply|yes|do it'; then
    mode="confirmed"
  fi
  if APEX_ROOT="${ROOT}" node "${ROOT}/scripts/vps/apply-actions.mjs" "${HEAL}/decision.json" "${mode}"; then
    if [[ "$(health_report)" == ok || "${signal}" == apex-sim-* ]]; then
      save_skill "${signal}" "${text}"
      if node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); process.exit((d.actions||[]).some(a=>a.op==="edit-java")?0:1)' "${HEAL}/decision.json"; then
        bash "${ROOT}/scripts/vps/heal-push.sh" "$(node -e 'const i=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); process.stdout.write(i.id||"manual")' "${HEAL}/open.json")" || true
      fi
      vps_telegram "Recovered ${signal}. The skill is stored."
      rm -f "${HEAL}/open.json"
      return 0
    fi
  fi
  vps_telegram "That reply did not recover ${signal}. Health is still failing."
}

while true; do
  refresh_skills
  signal="$(host_pressure)"
  if [[ "${signal}" == ok ]]; then
    signal="$(health_report)"
  fi
  if [[ "${signal}" == ok ]]; then
    signal="$(log_signal)"
  fi
  if [[ "${signal}" != ok ]]; then
    if [[ "${signal}" == high-* ]]; then
      HIGH=$((HIGH + 1))
    else
      HIGH=0
    fi
    if [[ "${signal}" != high-* || "${HIGH}" -ge 4 ]]; then
      open_incident "${signal}"
      HIGH=0
    fi
  else
    HIGH=0
  fi
  poll_reply
  sleep 15
done
