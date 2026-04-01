#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN_FLAG=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN_FLAG="--dry-run"
fi

echo "Starting ordered migration rollout: dev -> staging -> prod"

"$ROOT_DIR/scripts/supabase/migrate-env.sh" dev "$DRY_RUN_FLAG"
"$ROOT_DIR/scripts/supabase/migrate-env.sh" staging "$DRY_RUN_FLAG"

if [[ "${APPROVE_PROD_MIGRATION:-false}" != "true" ]]; then
  echo "Prod migration gate is closed."
  echo "To continue to production, run:"
  echo "  APPROVE_PROD_MIGRATION=true $0 ${DRY_RUN_FLAG}"
  exit 0
fi

echo "Production approval gate open. Continuing with prod migration."
"$ROOT_DIR/scripts/supabase/migrate-env.sh" prod "$DRY_RUN_FLAG"

echo "Ordered migration rollout complete."
