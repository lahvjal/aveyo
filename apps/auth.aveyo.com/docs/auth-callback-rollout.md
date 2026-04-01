# Auth Callback Rollout

This rollout configures Supabase Auth callback URLs for each environment and verifies cross-subdomain session behavior.

For hosted auth login app runtime setup, see `docs/auth-app-setup.md`.

## Callback Source

- `config/auth-callbacks.json`

Each environment defines:

- `siteUrl`
- `uriAllowList`
- `projectRef`

## Apply Supabase Auth Config

Set a personal access token with Auth config permissions:

```bash
export SUPABASE_ACCESS_TOKEN=...
```

Apply per environment (Management API patch; updates only callback fields):

```bash
npm run supabase:auth:callbacks:dev
npm run supabase:auth:callbacks:staging
npm run supabase:auth:callbacks:prod
```

Production callback updates should only run in approved release windows.

Optional fallback (CLI `config push` path):

```bash
npm run supabase:auth:callbacks:dev:cli
npm run supabase:auth:callbacks:staging:cli
```

Verify without changing config:

```bash
npm run supabase:auth:verify:dev
npm run supabase:auth:verify:staging
npm run supabase:auth:verify:prod
```

## Verify Session Flow

Run against a deployed API or local API:

```bash
API_BASE_URL=https://api-dev.aveyo.com TEST_ORIGIN=https://ava-dev.aveyo.com npm run supabase:session:verify
```
