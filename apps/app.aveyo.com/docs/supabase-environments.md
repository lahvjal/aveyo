# Supabase Environment Registry

This document is the source of truth for Aveyo platform Supabase environments and ownership.

## Projects

| Environment | Project Name | Project Ref | Region | Dashboard URL | Primary Owner | Backup Owner |
| --- | --- | --- | --- | --- | --- | --- |
| dev | `aveyo-apps-dev` | `safebiayjffnkcmtshni` | `us-east-2` | `https://supabase.com/dashboard/project/safebiayjffnkcmtshni` | `vel` | `TBD` |
| staging | `aveyo-apps-staging` | `awzyvdeyzpblonbzddwa` | `us-east-2` | `https://supabase.com/dashboard/project/awzyvdeyzpblonbzddwa` | `vel` | `TBD` |
| prod | `AveyoOrg` | `semzdcsumfnmjnhzhtst` | `us-east-2` | `https://supabase.com/dashboard/project/semzdcsumfnmjnhzhtst` | `vel` | `TBD` |

## Ownership Rules

- The primary owner approves schema/auth changes for that environment.
- Production changes require a second approver from backup ownership.
- Owners maintain rotation for migration rollouts and rollback calls.

## Required Secrets (outside git)

Store these in deployment systems (Vercel/GitHub), never in committed files:

- `SUPABASE_PROJECT_REF_DEV`
- `SUPABASE_PROJECT_REF_STAGING`
- `SUPABASE_PROJECT_REF_PROD`
- `SUPABASE_DB_PASSWORD_DEV`
- `SUPABASE_DB_PASSWORD_STAGING`
- `SUPABASE_DB_PASSWORD_PROD`

## CI/CD Gate

Workflow now lives in the monorepo root CI workflows (`../../.github/workflows/`).

- Runs migration/auth/session gate checks on PR and push.
- Runs non-prod rollout on manual dispatch (`dev` or `staging`).
- Runs prod rollout only through GitHub `production` environment approval.
