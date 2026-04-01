# Next Cookie Auth Template

This template is the standard foundation for any new Aveyo web app that should participate in shared platform auth.

It assumes:

- `auth.<env>.aveyo.com` handles credential entry and session bootstrap.
- `api.<env>.aveyo.com` owns shared HttpOnly session cookies.
- App frontend only checks/uses cookie-backed session APIs with `credentials: "include"`.

## Required Environment Variables

Copy `.env.example` to `.env.local` and fill values for the target environment.

- `NEXT_PUBLIC_AUTH_APP_URL`
- `NEXT_PUBLIC_PLATFORM_API_BASE_URL`

## Template Structure

- `lib/auth/config.ts` - auth URLs and redirect URL builder.
- `lib/auth/session.ts` - session fetch/logout helpers and cookie-aware API fetch wrapper.
- `lib/auth/use-auth-session.ts` - client hook to load and refresh session state.
- `app/login/page.tsx` - local login route that redirects to `auth.aveyo.com/login`.
- `app/page.tsx` - protected root example wired to cookie session checks.

## How To Use In A New App

1. Copy `lib/auth/*` into your app.
2. Copy `app/login/page.tsx` and keep `/login` route.
3. Add app-specific protected routes similar to `app/page.tsx`.
4. Ensure API calls use `authApiRequest` from `lib/auth/session.ts`.
5. Add the new app origin to:
   - `NEXT_PUBLIC_AUTH_RETURN_TO_ALLOWLIST` in `auth.aveyo.com`
   - `AVA_ALLOWED_ORIGINS` in `api`

## Auth Flow

1. App checks `GET /api/auth/session` with cookies.
2. If unauthenticated, app redirects to:
   `https://auth-<env>.aveyo.com/login?returnTo=<app-url>`.
3. `auth.aveyo.com` signs in user, calls `POST /api/auth/session/bootstrap`, then redirects back.
4. App loads with valid shared cookies and can call BFF APIs.

## Logout Flow

1. App calls `POST /api/auth/session/logout`.
2. App redirects to:
   `https://auth-<env>.aveyo.com/login?returnTo=<app-url>&logout=1`.
3. Auth app clears auth-domain Supabase session and returns to app login path.
