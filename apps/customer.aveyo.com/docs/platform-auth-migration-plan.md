# Platform Auth Migration Plan

This document captures the migration path for moving `customer.aveyo.com` to the shared Aveyo auth/session contract.

## Current State

- Local auth pages (`/login`, `/register`, `/forgot-password`) manage sign-in and account setup.
- Protected API routes primarily rely on local Supabase auth helper sessions.
- App does not yet consume centralized session endpoints at `api.<env>.aveyo.com`.

## Target State

- Credential entry is hosted by `auth.<env>.aveyo.com`.
- Session authority is `api.<env>.aveyo.com`.
- First-party app-to-BFF calls rely on shared cookies (`credentials: "include"`), not bearer headers.
- Customer app follows the platform template contract:
  - `NEXT_PUBLIC_AUTH_APP_URL`
  - `NEXT_PUBLIC_PLATFORM_API_BASE_URL`
  - `GET /api/auth/session`
  - `POST /api/auth/session/logout`

## Migration Phases

1. **Prepare env + helper layer (non-breaking)**
   - Add optional platform auth env vars to `.env.local.example`.
   - Keep existing auth behavior while introducing shared helper modules:
     - `src/lib/platform-auth/config.ts`
     - `src/lib/platform-auth/session.ts`

2. **Introduce hosted-login redirect flow**
   - Update local `/login` route to redirect to `auth.<env>.aveyo.com/login?returnTo=<customer-app-url>`.
   - Preserve local fallback path during transition window.

3. **Move route protection to centralized session checks**
   - Replace local-only gate assumptions with `GET /api/auth/session` checks.
   - Validate middleware behavior for unauthenticated redirects.

4. **Deprecate local credential entry**
   - Remove direct password sign-in/register forms after all environments pass cutover tests.
   - Keep account recovery UX routed through shared auth contract.

## Verification Checklist

- Unauthenticated user on protected route is redirected through hosted login flow.
- Successful sign-in returns to customer app without token hash parsing.
- Cookie-backed session check passes via `GET /api/auth/session`.
- Logout clears access and returns user to hosted login flow.

## Notes

- This plan intentionally avoids changing customer domain APIs in the same step.
- Domain API centralization is a separate decision track and should be gated by endpoint reuse.
