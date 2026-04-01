#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

TARGET_ENV="${1:-}"
DRY_RUN="${2:-}"

if [[ -z "$TARGET_ENV" ]]; then
  echo "Usage: $0 <dev|staging|prod> [--dry-run]"
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

env_upper="$(printf '%s' "$TARGET_ENV" | tr '[:lower:]' '[:upper:]')"

if [[ -z "$PROJECT_REF" ]]; then
  echo "Missing project ref for $TARGET_ENV."
  echo "Required:"
  echo "  SUPABASE_PROJECT_REF_${env_upper}"
  exit 1
fi

if [[ -z "$DB_PASSWORD" ]]; then
  echo "SUPABASE_DB_PASSWORD_${env_upper} is not set."
  echo "Proceeding with Supabase CLI cached credentials."
  echo "Set the password env var in CI for deterministic non-interactive runs."
fi

node "scripts/supabase/check-migration-source.mjs"

echo "Linking Supabase project: $PROJECT_REF ($TARGET_ENV)"
if [[ -n "$DB_PASSWORD" ]]; then
  supabase link --project-ref "$PROJECT_REF" -p "$DB_PASSWORD"
else
  supabase link --project-ref "$PROJECT_REF" --yes
fi

echo "Applying migrations to $TARGET_ENV..."
if [[ "$DRY_RUN" == "--dry-run" ]]; then
  if [[ -n "$DB_PASSWORD" ]]; then
    supabase db push --linked -p "$DB_PASSWORD" --include-all --dry-run
  else
    supabase db push --linked --include-all --dry-run
  fi
else
  if [[ -n "$DB_PASSWORD" ]]; then
    supabase db push --linked -p "$DB_PASSWORD" --include-all
  else
    supabase db push --linked --include-all
  fi
fi

echo "Migration push complete for $TARGET_ENV."
