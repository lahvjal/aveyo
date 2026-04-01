#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

TARGET_ENV="${1:-}"

if [[ -z "$TARGET_ENV" ]]; then
  echo "Usage: $0 <dev|staging|prod>"
  exit 1
fi

case "$TARGET_ENV" in
  dev)
    PROJECT_REF="${SUPABASE_PROJECT_REF_DEV:-safebiayjffnkcmtshni}"
    DB_PASSWORD="${SUPABASE_DB_PASSWORD_DEV:-}"
    ;;
  staging)
    PROJECT_REF="${SUPABASE_PROJECT_REF_STAGING:-awzyvdeyzpblonbzddwa}"
    DB_PASSWORD="${SUPABASE_DB_PASSWORD_STAGING:-}"
    ;;
  prod)
    PROJECT_REF="${SUPABASE_PROJECT_REF_PROD:-semzdcsumfnmjnhzhtst}"
    DB_PASSWORD="${SUPABASE_DB_PASSWORD_PROD:-}"
    ;;
  *)
    echo "Unknown environment: $TARGET_ENV"
    exit 1
    ;;
esac

if [[ "$TARGET_ENV" == "prod" && "${APPROVE_PROD_SEED:-false}" != "true" ]]; then
  echo "Prod seed gate is closed."
  echo "Set APPROVE_PROD_SEED=true to allow prod seed runs."
  exit 1
fi

if [[ -n "$DB_PASSWORD" ]]; then
  supabase link --project-ref "$PROJECT_REF" -p "$DB_PASSWORD"
else
  supabase link --project-ref "$PROJECT_REF" --yes
fi

echo "Running seed for $TARGET_ENV ($PROJECT_REF)..."
if [[ -n "$DB_PASSWORD" ]]; then
  supabase db push --linked -p "$DB_PASSWORD" --include-seed
else
  supabase db push --linked --include-seed
fi
echo "Seed completed for $TARGET_ENV."
