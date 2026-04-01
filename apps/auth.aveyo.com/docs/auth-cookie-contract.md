# Auth and Cookie Contract

This workspace expects shared authentication across:

- `aveyo.com` (customer app)
- `auth.aveyo.com` (login/callback origin)
- `ava.aveyo.com` (embedded widget host)
- `customer.aveyo.com` (support app)
- `api.aveyo.com` (BFF)

## Session Authority Ownership

The centralized API/session implementation lives in:

- `../../api.aveyo.com`
- `../../api.aveyo.com/docs/session-authority-contract.md`

This app is the codebase of record for:

- `GET /api/auth/session`
- `POST /api/auth/session/bootstrap`
- `POST /api/auth/session/logout`

## Session Cookie Rules

For Aveyo subdomains, API enforces this contract:

- `Domain=.aveyo.com`
- `SameSite=Lax`
- `Secure=true`
- `HttpOnly=true`

For localhost development, API automatically uses host-only cookies so
`auth.aveyo.com` and app workspaces can run over plain `http://localhost`:

- no explicit `Domain` attribute
- `SameSite=Lax`
- `Secure=false`
- `HttpOnly=true`

These values are read from:

- `AVA_SESSION_COOKIE_DOMAIN`
- `AVA_SESSION_COOKIE_SAMESITE`
- `AVA_SESSION_COOKIE_SECURE`
- `AVA_SESSION_COOKIE_HTTPONLY`

## Supabase/Auth Environment

Set these in each app that needs Supabase auth plumbing:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AUTH_APP_URL` (shared login host, e.g. `https://auth-dev.aveyo.com`)

Widget and support apps may also set:

- `NEXT_PUBLIC_PLATFORM_API_BASE_URL` (for cross-origin BFF calls)

The API app can set:

- `AVA_ALLOWED_ORIGINS` (comma-separated CORS allowlist used with credentials)

## API Session Endpoints

Cookie session state is managed by API endpoints:

- `GET /api/auth/session` - validates cookie session and refreshes access cookies when needed.
- `POST /api/auth/session/bootstrap` - accepts Supabase tokens from `auth.aveyo.com` and sets shared cookies.
- `POST /api/auth/session/logout` - clears shared session cookies across subdomains.

## App Template Standard

All new apps should implement this contract using:

- `docs/auth-template.md`
- `templates/next-cookie-auth-app/`
