# Session Authority Contract

This app is the single session authority for Aveyo platform auth.

- Auth entrypoint: `auth.<env>.aveyo.com`
- Session authority: `api.<env>.aveyo.com` (this codebase)
- Consumer apps: `ava.<env>.aveyo.com`, `customer.<env>.aveyo.com`, `widget.<env>.aveyo.com`, and any app onboarded through the auth template.

## Ownership

- Source of truth implementation: `api.aveyo.com`
- Legacy rollback mirror (temporary only): `archive/ava26-apps-api`

## Endpoint Contract

Required platform session endpoints:

- `GET /api/auth/session`
  - Validates cookie-backed session.
  - Returns `401` with unauthenticated payload when session is invalid/missing.
  - May refresh access cookies when refresh token is valid.
- `POST /api/auth/session/bootstrap`
  - Accepts Supabase `accessToken` + `refreshToken` from `auth.aveyo.com`.
  - Validates token/user and sets shared cookies.
- `POST /api/auth/session/logout`
  - Clears shared session cookies.

## Cookie Contract

For Aveyo subdomains, enforced by API configuration and middleware:

- `Domain=.aveyo.com`
- `SameSite=Lax`
- `Secure=true`
- `HttpOnly=true`

Localhost development uses a host-only cookie policy automatically:

- no explicit `Domain` attribute
- `SameSite=Lax`
- `Secure=false`
- `HttpOnly=true`

Environment keys:

- `AVA_SESSION_COOKIE_DOMAIN`
- `AVA_SESSION_COOKIE_SAMESITE`
- `AVA_SESSION_COOKIE_SECURE`
- `AVA_SESSION_COOKIE_HTTPONLY`

## Browser Contract

First-party platform apps must:

- Use `NEXT_PUBLIC_AUTH_APP_URL`
- Use `NEXT_PUBLIC_AVA_API_BASE_URL`
- Check session via `GET /api/auth/session`
- Use cookie-authenticated API calls (`credentials: "include"`)
- Avoid `Authorization: Bearer` for first-party app-to-BFF requests

## CORS / Origin Policy

Allowed browser origins are controlled by:

- `AVA_ALLOWED_ORIGINS` (comma-separated list)

When set correctly, API responds with credentialed CORS headers for allowlisted origins.

## Verification

Minimum verification for any environment cutover:

1. Unauthenticated `/api/auth/session` returns `401`.
2. Auth flow at `auth.<env>.aveyo.com/login` can bootstrap cookie session.
3. Authenticated `/api/auth/session` returns `200`.
4. `POST /api/auth/session/logout` clears access.
5. CORS preflight succeeds for expected app origins.
