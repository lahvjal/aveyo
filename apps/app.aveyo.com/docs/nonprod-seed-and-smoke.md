# Non-Prod Seed and Smoke Checks

Use this flow after migrations in `dev` and `staging`.

## Commands

Seed + smoke both non-production environments:

```bash
npm run supabase:seed-and-smoke:nonprod
```

Run individually:

```bash
npm run supabase:seed:dev
npm run supabase:smoke:dev

npm run supabase:seed:staging
npm run supabase:smoke:staging
```

## Source Paths

- seed SQL: `supabase/seed.sql`
- smoke scripts: `scripts/supabase/smoke-nonprod.mjs`
