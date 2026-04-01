# auth.aveyo.com App Setup

This document covers the hosted auth app (`/login`) that brokers sign-in and mints shared cookie sessions through the API.

Centralized API ownership:

- `../../api.aveyo.com` (session/bootstrap/logout endpoints and cookie policy enforcement)

## Runtime Variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AUTH_RETURN_TO_ALLOWLIST` (comma-separated origins allowed in `?returnTo=`)
- `NEXT_PUBLIC_AUTH_API_BASE_URL` (API origin that sets/clears cross-subdomain cookies)

Optional:

- `NEXT_PUBLIC_AUTH_DEFAULT_RETURN_TO`

Environment templates:

- `.env.dev.example`
- `.env.staging.example`
- `.env.production.example`

## Local Run

```bash
npm install
npm run dev
```

Default local URL is `http://localhost:3003/login`.

For new consumer apps, use the standardized starter at:

- `docs/auth-template.md`
- `templates/next-cookie-auth-app/`

## Login Contract

Calling app redirects to:

```text
https://auth-<env>.aveyo.com/login?returnTo=<url-encoded-caller-login-url>
```

On successful sign-in, auth app calls:

```text
POST <NEXT_PUBLIC_AUTH_API_BASE_URL>/api/auth/session/bootstrap
```

with the Supabase `accessToken` and `refreshToken`, then redirects to `returnTo` **without** hash tokens.

## Logout Contract

To force account switching:

```text
https://auth-<env>.aveyo.com/login?returnTo=<caller-login-url>&logout=1
```

`logout=1` signs out the auth-domain Supabase session and clears API cookie session state before showing login.
