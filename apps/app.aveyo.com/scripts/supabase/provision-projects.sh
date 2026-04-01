#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ORG_ID="${SUPABASE_ORG_ID:-}"
REGION="${SUPABASE_REGION:-us-east-2}"
DEV_PROJECT_NAME="${SUPABASE_DEV_PROJECT_NAME:-aveyo-apps-dev}"
STAGING_PROJECT_NAME="${SUPABASE_STAGING_PROJECT_NAME:-aveyo-apps-staging}"

if [[ -z "$ORG_ID" ]]; then
  echo "SUPABASE_ORG_ID is required."
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required."
  exit 1
fi

random_password() {
  openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | cut -c1-24
}

find_ref_by_name() {
  local project_name="$1"
  local projects_json
  projects_json="$(supabase projects list --output json)"
  node -e '
const projects = JSON.parse(process.argv[1]);
const projectName = process.argv[2];
const match = projects.find((item) => item.name === projectName);
if (match) process.stdout.write(match.ref);
' "$projects_json" "$project_name"
}

create_if_missing() {
  local project_name="$1"
  local password_env_name="$2"
  local ref

  ref="$(find_ref_by_name "$project_name")"
  if [[ -n "$ref" ]]; then
    echo "Project already exists: $project_name ($ref)"
    return 0
  fi

  local db_password="${!password_env_name:-}"
  if [[ -z "$db_password" ]]; then
    db_password="$(random_password)"
    echo "Generated $password_env_name. Store this securely before running migrations."
    echo "$password_env_name=$db_password"
  fi

  echo "Creating project: $project_name (region: $REGION)"
  supabase projects create "$project_name" \
    --org-id "$ORG_ID" \
    --region "$REGION" \
    --db-password "$db_password" \
    --yes
}

create_if_missing "$DEV_PROJECT_NAME" "SUPABASE_DB_PASSWORD_DEV"
create_if_missing "$STAGING_PROJECT_NAME" "SUPABASE_DB_PASSWORD_STAGING"

echo "Provisioning complete."
