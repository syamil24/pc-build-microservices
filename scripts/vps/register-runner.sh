#!/usr/bin/env bash
# Registers a GitHub Actions runner on this Linux host. It only runs the deploy workflow.
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"

if [[ -z "${GH_RUNNER_TOKEN:-}" ]]; then
  vps_log "Create a runner token in GitHub: Settings, Actions, Runners, New self-hosted runner."
  vps_log "Then run: GH_RUNNER_TOKEN=... bash scripts/vps/register-runner.sh"
  exit 1
fi

REPO="${GH_REPO:-syamil24/pc-build-microservices}"
DEST="${HOME}/actions-runner"
mkdir -p "${DEST}"
cd "${DEST}"
ver="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p' | head -n 1)"
arch="$(uname -m)"
case "${arch}" in
  x86_64) pkg=linux-x64 ;;
  aarch64|arm64) pkg=linux-arm64 ;;
  *) vps_log "Unsupported architecture ${arch}"; exit 1 ;;
esac
curl -fsSL -o runner.tar.gz "https://github.com/actions/runner/releases/download/v${ver}/actions-runner-${pkg}-${ver}.tar.gz"
tar -xzf runner.tar.gz
./config.sh --unattended --url "https://github.com/${REPO}" --token "${GH_RUNNER_TOKEN}" \
  --name apex-vps --labels apex-vps --replace
sudo ./svc.sh install
sudo ./svc.sh start
vps_log "Runner apex-vps is installed. Pull-request jobs stay on GitHub-hosted runners."
