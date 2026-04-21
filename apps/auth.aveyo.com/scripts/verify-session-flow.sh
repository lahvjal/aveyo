#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:4002}"
TEST_ORIGIN="${TEST_ORIGIN:-https://ava-dev.aveyo.com}"
SESSION_URL="${API_BASE_URL%/}/api/auth/session"

response_body_file="$(mktemp)"
response_header_file="$(mktemp)"
trap 'rm -f "$response_body_file" "$response_header_file"' EXIT

echo "Checking unauthenticated session response: $SESSION_URL"
status_code="$(curl -sS -D "$response_header_file" -o "$response_body_file" -w "%{http_code}" "$SESSION_URL")"
if [[ "$status_code" != "401" ]]; then
  echo "Expected /api/auth/session to return 401 when unauthenticated, got $status_code"
  cat "$response_body_file"
  exit 1
fi

node - <<'NODE' "$response_body_file"
const fs = require("node:fs");
const body = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (body.authenticated !== false) {
  throw new Error("Expected authenticated=false in unauthenticated session response.");
}
if (body.user !== null) {
  throw new Error("Expected user=null in unauthenticated session response.");
}
NODE

node - <<'NODE' "$response_header_file"
const fs = require("node:fs");
const headersRaw = fs.readFileSync(process.argv[2], "utf8");
if (/^set-cookie:/im.test(headersRaw)) {
  throw new Error(
    "Anonymous unauthenticated session reads must not emit Set-Cookie headers or clear a valid browser session."
  );
}
NODE

echo "Checking CORS preflight for origin: $TEST_ORIGIN"
curl -sS -o /dev/null -D "$response_header_file" \
  -X OPTIONS "$SESSION_URL" \
  -H "Origin: $TEST_ORIGIN" \
  -H "Access-Control-Request-Method: GET"

node - <<'NODE' "$response_header_file" "$TEST_ORIGIN"
const fs = require("node:fs");
const headersRaw = fs.readFileSync(process.argv[2], "utf8");
const expectedOrigin = process.argv[3];

const lines = headersRaw.split(/\r?\n/).filter(Boolean);
const map = new Map();
for (const line of lines) {
  const idx = line.indexOf(":");
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim().toLowerCase();
  const value = line.slice(idx + 1).trim();
  map.set(key, value);
}

if (map.get("access-control-allow-origin") !== expectedOrigin) {
  throw new Error(
    `access-control-allow-origin mismatch. Expected ${expectedOrigin}, got ${map.get("access-control-allow-origin")}`
  );
}
if (map.get("access-control-allow-credentials") !== "true") {
  throw new Error("access-control-allow-credentials must be true.");
}
NODE

echo "Session flow verification passed."
