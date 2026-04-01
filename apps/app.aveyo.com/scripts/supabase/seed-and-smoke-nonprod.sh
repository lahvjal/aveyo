#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

TARGET="${1:-all}"

run_for_env() {
  local env_name="$1"
  echo "Seeding $env_name..."
  "$ROOT_DIR/scripts/supabase/seed-env.sh" "$env_name"

  echo "Running smoke checks for $env_name..."
  node "$ROOT_DIR/scripts/supabase/smoke-nonprod.mjs" "$env_name"
}

case "$TARGET" in
  dev)
    run_for_env dev
    ;;
  staging)
    run_for_env staging
    ;;
  all)
    run_for_env dev
    run_for_env staging
    ;;
  *)
    echo "Usage: $0 [dev|staging|all]"
    exit 1
    ;;
esac

echo "Non-prod seed + smoke complete."
