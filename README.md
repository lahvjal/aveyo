# Aveyo Monorepo

This repository is the canonical monorepo for Aveyo web apps and shared packages.

## Workspace Layout

- `apps/` active deployable applications
- `packages/` shared workspace packages
- `archive/` non-active legacy/partial apps kept for rollback/reference

## Local Environment Variables

All app `next.config` entrypoints load environment variables from the monorepo root.

- Primary local file: `/.env.local`
- Optional env-specific files: `/.env.development.local`, `/.env.test.local`, `/.env.production.local`
- Base fallback: `/.env`

If you still have app-level `.env.local` files from older setup, remove or stop using them to avoid confusion. The root env files are now the single source of truth for local app runs.
When both root and app-level files exist, root values are applied by the shared loader.

## Active Apps

- `apps/app.aveyo.com` (primary orchestration and platform operations)
- `apps/api.aveyo.com`
- `apps/auth.aveyo.com`
- `apps/ava.aveyo.com`
- `apps/org.aveyo.com`
- `apps/customer.aveyo.com`
- `apps/kpi.aveyo.com`
- `apps/aveyo.com`

## Shared Packages

- `packages/chat-domain` (`@ava/chat-domain`)
- `packages/config` (`@ava/config`)
- `packages/ui` (`@ava/ui`)

## Archived Apps

- `archive/ava26-apps-api`
- `archive/ava26-customer-widget`

## Orchestration Model

`app.aveyo.com` is the control plane for cross-app orchestration scripts. Other apps should delegate cross-app operational tasks to scripts owned in `apps/app.aveyo.com`.

Core orchestration currently includes:

- `app-aveyo-com`
- `ava-aveyo-com`
- `api-aveyo-com`
- `auth-aveyo-com`
- `org-aveyo-com`
- `kpi-aveyo-com`

Separate tracks (intentionally excluded from core orchestration):

- `apps/customer.aveyo.com`
- `apps/aveyo.com`

## Baseline Commands

From repository root:

- `pnpm install`
- `pnpm run build`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run orchestrate:dev`

From `apps/app.aveyo.com`:

- `pnpm run orchestration:dev`
- `pnpm run orchestration:build`
- `pnpm run supabase:migrate:ordered`
- `pnpm run supabase:seed-and-smoke:nonprod`
