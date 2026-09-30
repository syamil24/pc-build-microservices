#!/usr/bin/env bash
# Pushes a recovered Java edit to a heal/* branch and opens a pull request.
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
ROOT="$(vps_root)"
cd "${ROOT}"
vps_load_env "${ROOT}"
id="$1"
if [[ -z "$(git status --porcelain -- services apex-common apex-web)" ]]; then
  vps_log "No Java changes to push"
  exit 0
fi
branch="heal/${id}"
git checkout -B "${branch}"
git add services apex-common apex-web
git -c user.email="apex-heal@users.noreply.github.com" -c user.name="Apex Heal" \
  commit -m "Heal ${id}"
if [[ -z "${HEAL_GITHUB_TOKEN:-}" ]]; then
  vps_telegram "Heal ${id} is committed locally on ${branch}. HEAL_GITHUB_TOKEN is not set, so no pull request was opened. The next deploy from master replaces this build unless you merge the branch."
  exit 0
fi
git push "https://x-access-token:${HEAL_GITHUB_TOKEN}@github.com/syamil24/pc-build-microservices.git" "HEAD:${branch}"
pr="$(curl -fsS -X POST -H "Authorization: Bearer ${HEAL_GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/syamil24/pc-build-microservices/pulls" \
  -d "{\"title\":\"Heal ${id}\",\"head\":\"${branch}\",\"base\":\"master\",\"body\":\"The VPS monitor edited Java after a recovered incident. The running build keeps this change until master is deployed.\"}")"
url="$(printf '%s' "${pr}" | sed -n 's/.*"html_url": *"\([^"]*\)".*/\1/p' | head -n 1)"
vps_telegram "Heal ${id} is on ${url}. The VPS keeps this build until you merge it. The next deploy from master replaces it otherwise."
