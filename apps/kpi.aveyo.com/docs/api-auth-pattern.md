# API Auth Pattern

All `src/app/api/*` routes now follow one server-side auth pattern:

1. Read request cookies and validate session with `GET /api/auth/session` on `api.<env>.aveyo.com`.
2. Resolve the current user + role from the shared session payload.
3. Load profile flags (`is_executive` / `is_super_admin`) server-side.
4. Reject unauthenticated requests with `401` and unauthorized requests with `403`.

Implementation helpers:

- `src/lib/api-auth.ts` (route-side auth guard)
- `src/lib/auth/session.ts` (cookie-aware session and API request helpers)

## Why

- Prevent mixed auth behavior between routes.
- Keep session ownership centralized in `api.<env>.aveyo.com`.
- Avoid exposing admin/debug/schema endpoints without authentication.

## Route Expectations

- Client requests to local API routes use cookie-authenticated `fetch` (`credentials: "include"`).
- Server routes call `requireAuthenticatedContext(request)` before reading or mutating data.
- Public health checks can remain separate from this pattern.
