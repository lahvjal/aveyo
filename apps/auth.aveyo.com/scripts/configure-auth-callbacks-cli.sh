#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET_ENV="${1:-}"
DRY_RUN="${2:-}"

if [[ -z "$TARGET_ENV" ]]; then
  echo "Usage: $0 <dev|staging|prod> [--dry-run]"
  exit 1
fi

if [[ "$TARGET_ENV" == "prod" && "${APPROVE_PROD_AUTH_CONFIG:-false}" != "true" ]]; then
  echo "Prod auth callback gate is closed."
  echo "Set APPROVE_PROD_AUTH_CONFIG=true to allow prod auth config updates."
  exit 1
fi

config_json="$(node -e '
const fs = require("node:fs");
const cfg = JSON.parse(fs.readFileSync("config/auth-callbacks.json", "utf8"));
const env = process.argv[1];
if (!cfg[env]) {
  process.exit(1);
}
process.stdout.write(JSON.stringify(cfg[env]));
' "$TARGET_ENV")"

if [[ -z "$config_json" ]]; then
  echo "No auth callback config found for env: $TARGET_ENV"
  exit 1
fi

project_ref="$(node -e 'const c=JSON.parse(process.argv[1]); process.stdout.write(c.projectRef);' "$config_json")"
site_url="$(node -e 'const c=JSON.parse(process.argv[1]); process.stdout.write(c.siteUrl);' "$config_json")"
uri_allow_list_csv="$(node -e 'const c=JSON.parse(process.argv[1]); process.stdout.write(c.uriAllowList.join(","));' "$config_json")"

supabase_config_source="${SUPABASE_CONFIG_SOURCE:-../app.aveyo.com/supabase/config.toml}"
if [[ ! -f "$supabase_config_source" ]]; then
  echo "Supabase config source not found: $supabase_config_source"
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
mkdir -p "$tmp_dir/supabase"
cp "$supabase_config_source" "$tmp_dir/supabase/config.toml"

node - <<'NODE' "$tmp_dir/supabase/config.toml" "$site_url" "$uri_allow_list_csv"
const fs = require("node:fs");
const path = process.argv[2];
const siteUrl = process.argv[3];
const allowList = process.argv[4].split(",").map((v) => v.trim()).filter(Boolean);

let content = fs.readFileSync(path, "utf8");
content = content.replace(/site_url = ".*"/, `site_url = "${siteUrl}"`);
content = content.replace(
  /additional_redirect_urls = \[[^\]]*\]/,
  `additional_redirect_urls = [${allowList.map((item) => `"${item}"`).join(", ")}]`
);
fs.writeFileSync(path, content);
NODE

echo "Prepared auth config for $TARGET_ENV"
echo "  project_ref: $project_ref"
echo "  site_url:    $site_url"
echo "  redirects:   $uri_allow_list_csv"

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "Dry run requested; skipping supabase config push."
  exit 0
fi

supabase config push --project-ref "$project_ref" --workdir "$tmp_dir" --yes
echo "Auth callback config pushed for $TARGET_ENV."
