# app.aveyo.com

`app.aveyo.com` is the shared dashboard app for the Aveyo multi-app platform.

This workspace also keeps the shared Supabase platform orchestration scripts used by all apps.

## Dashboard app

The dashboard provides:

- cookie-auth protected platform entrypoint
- one-click links to Aveyo apps for the current environment (`local`, `dev`, `staging`, `prod`)
- quick reference for platform rollout commands

### Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Default local ports:

- dashboard: `http://localhost:3004`
- auth app: `http://localhost:3003`
- api app: `http://localhost:3002`

## Shared platform operations

Shared migration/seed/scripts live under:

- `supabase/`
- `scripts/supabase/`

Core commands:

```bash
npm run supabase:migrations:check-source
npm run supabase:migrate:ordered
npm run supabase:seed-and-smoke:nonprod
npm run supabase:env:check
```

Auth callback/session operations are delegated to `../auth.aveyo.com`.
