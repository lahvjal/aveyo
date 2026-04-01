# Supabase Migration Source and Rollout

## Canonical Source of Truth

Shared Supabase schema changes are currently authored in:

- `supabase/migrations`

## Drift Guard

Run this before any migration push:

```bash
npm run supabase:migrations:check-source
```

## Ordered Rollout

Run migrations in strict order:

1. `dev`
2. `staging`
3. `prod` (only after explicit approval gate)

Script:

```bash
npm run supabase:migrate:ordered
```

The ordered script automatically:

- pushes to `dev`
- pushes to `staging`
- stops before `prod` unless `APPROVE_PROD_MIGRATION=true`
