# App Auth Template Standard

This defines the required structure for any new app that joins Aveyo platform auth.

## Goal

New app onboarding should be "copy template, set env vars, deploy allowlists" with no app-specific auth rewrites.

## Platform Contract

- `auth.<env>.aveyo.com` is the only credential entrypoint.
- `api.<env>.aveyo.com` is the only shared session owner.
- App frontends do not parse token hashes and do not attach bearer tokens.
- App frontends rely on cookie session checks and cookie-authenticated API calls.

Codebase of record for the shared session owner:

- `../../api.aveyo.com`

## Required Routes in Every App

- `GET /login` (or `/login` page route): redirect to shared auth app with `returnTo`.
- Primary protected route(s): check `GET /api/auth/session`; redirect unauthenticated users to `/login`.

## Required Env Vars in Every App

- `NEXT_PUBLIC_AUTH_APP_URL`
- `NEXT_PUBLIC_PLATFORM_API_BASE_URL`

## Required API Endpoints (owned by `api`)

- `GET /api/auth/session`
- `POST /api/auth/session/bootstrap`
- `POST /api/auth/session/logout`

## Template Source

Use:

- `templates/next-cookie-auth-app/.env.example`
- `templates/next-cookie-auth-app/lib/auth/*`
- `templates/next-cookie-auth-app/app/login/page.tsx`
- `templates/next-cookie-auth-app/app/page.tsx`

## One-Time Onboarding Steps Per New App

1. Add app origin to `NEXT_PUBLIC_AUTH_RETURN_TO_ALLOWLIST` in `auth.aveyo.com`.
2. Add app origin to `AVA_ALLOWED_ORIGINS` in `api`.
3. Add app env vars in deployment target.
4. Verify login, refresh, and logout flow end-to-end.

## Definition of Done

- App can start unauthenticated and redirect to shared auth.
- After sign-in, app lands on protected route with valid session.
- API calls work using `credentials: "include"` only.
- Sign-out clears app access and returns through auth logout flow.
- No app code uses `Authorization: Bearer` for first-party API calls.
