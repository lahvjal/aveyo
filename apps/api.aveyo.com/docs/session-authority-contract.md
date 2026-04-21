# Session Authority Contract

This app is the single session authority for Aveyo first-party authentication.

- Hosted login entrypoint: `auth.<env>.aveyo.com`
- Session authority: `api.<env>.aveyo.com`
- First-party consumers: `app`, `ava`, `customer`, `kpi`, `org`, `marketing`, `aveyo.com`, and widget hosts that use the first-party auth contract

## Ownership

- Source of truth implementation: `apps/api.aveyo.com`
- Hosted login handoff: `apps/auth.aveyo.com`
- Shared browser/server helpers: `packages/auth`
- URL registry: `packages/config/runtime/app-urls.js`

## Core Invariants

These rules should stay true across every refactor:

1. Hosted login only establishes browser session state in this order: `bootstrap -> verify -> redirect`.
2. No client or server code may mutate or revoke the freshly bootstrapped platform session after `POST /api/auth/session/bootstrap` succeeds.
3. `GET /api/auth/session` is the only first-party browser session truth source.
4. Anonymous `401` session reads must not emit `Set-Cookie` clears.
5. Token refresh is an implementation detail of the session authority, not of individual apps.
6. First-party apps authenticate with cookies plus `credentials: "include"`, not bearer tokens.
7. Top-level protected-route decisions should happen in middleware or on the server whenever practical.

## Endpoint Contract

### `GET /api/auth/session`

Responsibilities:

- Validate cookie-backed session state.
- Recover from access-token loss when a refresh token is still present.
- Refresh access/refresh cookies when Supabase refresh succeeds.
- Return `401` with a structured unauthenticated payload when session recovery fails.

Success payload shape:

- `authenticated: true`
- `role`
- `userType`
- `access`
- `user`

Unauthenticated payload shape:

- `authenticated: false`
- `role: "unknown"`
- `userType: "unknown"`
- `access`
- `user: null`
- non-production only: `failure`

Current non-production failure reasons:

- `missing_access_token`
- `invalid_access_token`
- `refresh_failed`
- `refreshed_access_token_invalid`
- `project_ref_mismatch`

Notes:

- The route only clears cookies when the request actually carried session material.
- In non-production the route also emits `x-ava-auth-reason` for faster debugging.
- Project-ref mismatch diagnostics are derived from the Supabase token issuer/ref claims.

### `POST /api/auth/session/bootstrap`

Responsibilities:

- Accept `accessToken` and `refreshToken` from hosted login.
- Validate that the access token resolves to a real user.
- Set the shared platform cookies.

Error codes:

- `MISSING_BOOTSTRAP_TOKENS`
- `INVALID_SESSION_TOKEN_PAYLOAD`

### `POST /api/auth/session/logout`

Responsibilities:

- Clear shared platform cookies.
- Leave the browser in a signed-out first-party state.

## Cookie Contract

Production / Aveyo subdomains:

- `Domain=.aveyo.com`
- `SameSite=Lax`
- `Secure=true`
- `HttpOnly=true`

Local development:

- host-only cookies
- no explicit `Domain`
- `SameSite=Lax`
- `Secure=false`
- `HttpOnly=true`

Environment keys:

- `AVA_SESSION_COOKIE_DOMAIN`
- `AVA_SESSION_COOKIE_SAMESITE`
- `AVA_SESSION_COOKIE_SECURE`
- `AVA_SESSION_COOKIE_HTTPONLY`

## Origin Policy

Credentialed CORS allowlists come from two places:

1. Generated first-party origins from `packages/config/runtime/app-urls.js`
2. Optional operator overrides via `AVA_ALLOWED_ORIGINS`

This keeps the canonical first-party surface list in one place and reduces drift between apps, auth redirects, and API CORS policy.

## Browser Contract

First-party apps must:

- build login redirects with the shared helpers in `@ava/auth` or `@ava/config/runtime/auth-urls`
- read session state through the shared browser auth client / store in `@ava/auth`
- use `credentials: "include"` for cookie-authenticated requests
- avoid app-local polling loops when a shared session store already exists for that origin
- prefer host-provided widget session snapshots over widget-owned polling

First-party apps must not:

- clear cookies from anonymous `401` reads
- maintain their own token refresh logic
- mix bearer-token auth into the first-party browser session flow
- add new top-level client-only redirect guards when middleware/server checks are practical

## Local Development Caveats

`SameSite=Lax` plus multi-port localhost can look like a cross-site subrequest to the browser. When that happens, a consumer app may bootstrap successfully and still read `401` from `GET /api/auth/session` because cookies were not attached to a cross-origin fetch.

Current supported workaround:

- use same-origin rewrites for local session reads where needed, such as `apps/aveyo.com/next.config.ts`

Treat those rewrites as local topology glue, not the long-term architecture.

## Server Gating Pattern

Preferred pattern for protected first-party routes:

1. Middleware or server entrypoint calls `fetchPlatformSessionForRequest`.
2. If session is unauthenticated, redirect to hosted login with `returnTo=<current-url>`.
3. Forward any refreshed `Set-Cookie` headers onto the middleware/server response.
4. Let client code handle only secondary UI decisions, not the first auth gate.

Reference utilities:

- `packages/auth/src/index.js`
- `apps/customer.aveyo.com/src/middleware.ts`

## Verification

Minimum verification for any auth change:

1. Unauthenticated `GET /api/auth/session` returns `401`.
2. Anonymous `GET /api/auth/session` does not emit `Set-Cookie`.
3. Hosted login can bootstrap cookies and redirect to a trusted `returnTo`.
4. Authenticated `GET /api/auth/session` returns `200`.
5. `POST /api/auth/session/logout` clears access.
6. CORS preflight succeeds for expected first-party origins.
7. Local multi-port handoff still succeeds for the supported localhost surfaces.

Current automated coverage:

- API session contract tests in `apps/api.aveyo.com/lib/auth/*.test.ts`
- shell contract verification in `apps/auth.aveyo.com/scripts/verify-session-flow.sh`
- browser handoff coverage in `apps/auth.aveyo.com/tests/auth-handoff.spec.js`

## Troubleshooting Matrix

### Login redirects immediately without showing the form

Likely causes:

- stale Supabase browser session on `auth`
- hosted login callback/query params still present
- `logout=1` not applied when forcing a fresh sign-in

Check:

- hosted auth page state
- whether Supabase session already exists before the form step

### Login succeeds, then consumer app reads `401`

Likely causes:

- anonymous `401` cleared valid cookies
- local multi-port cookie attachment problem
- post-bootstrap session mutation

Check:

- `x-ava-auth-reason` header in non-production
- whether `Set-Cookie` clear headers were emitted on the failing `401`
- whether the consumer app uses a same-origin local session read path

### Session reads keep failing after refresh

Likely causes:

- stale or revoked refresh token
- invalid access token returned after refresh
- Supabase project mismatch

Check:

- `failure.reason`
- expected vs actual project ref diagnostics

### Customer or employee lands in the wrong app after auth

Likely causes:

- invalid or untrusted `returnTo`
- incorrect role/userType inference
- app-local redirect fallback drift

Check:

- `returnTo` validation
- resolved `role` and `userType`
- shared URL helper usage
