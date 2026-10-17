#!/usr/bin/env bash
# Hits the gateway the way a shopper would: catalog, quote, register, cart.
set -Eeuo pipefail
BASE="${APEX_BASE_URL:-http://127.0.0.1:8080}"
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*"; }
on_err() { log "ERROR at line $1: $2"; exit 1; }
trap 'on_err "$LINENO" "$BASH_COMMAND"' ERR

log "Platform overview is closed to anonymous callers"
platform_status="$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/api/platform/overview")"
if [[ "${platform_status}" != "401" ]]; then
  log "ERROR: expected 401 from /api/platform/overview, got ${platform_status}"
  exit 1
fi
log "Categories"
curl -fsS "${BASE}/api/catalog/categories" >/dev/null
log "Search GPUs under RM 2500"
curl -fsS "${BASE}/api/catalog/products?category=GPU&maxPrice=250000&q=helix" >/dev/null
CPU="$(curl -fsS "${BASE}/api/catalog/products?category=CPU&q=7600")"
ID="$(printf '%s' "${CPU}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n 1)"
log "Quote for ${ID}"
curl -fsS -H 'Content-Type: application/json' -d "{\"lines\":[{\"productId\":\"${ID}\",\"quantity\":1}]}" \
  "${BASE}/api/catalog/builder/quote" >/dev/null
EMAIL="smoke-$(date +%s)@apexbuild.test"
log "Register ${EMAIL}"
REGISTERED="$(curl -fsS -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"SmokeTest1\",\"fullName\":\"Smoke\"}" \
  "${BASE}/api/auth/register")"
TOKEN="$(printf '%s' "${REGISTERED}" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')"
customer_status="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${TOKEN}" "${BASE}/api/platform/overview")"
if [[ "${customer_status}" != "403" ]]; then
  log "ERROR: a customer token should get 403 from live ops, got ${customer_status}"
  exit 1
fi
log "Smoke test passed"
