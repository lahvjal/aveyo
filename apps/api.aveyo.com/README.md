# api.aveyo.com

**Codebase of record** for the Aveyo browser-facing API (Next.js BFF). It owns session validation, CORS/cookie contract enforcement, conversations/handoff routes, and related server logic.

See `docs/session-authority-contract.md` for the canonical platform session contract.
See `docs/endpoint-centralization-gates.md` for endpoint centralization criteria.
See `docs/ava-mysql-phase3-runbook.md` for Ava MySQL retrieval hardening and index guidance.

## Relationship to `ava26`

- **Develop and ship from this repo.** The former in-workspace copy is archived at `archive/ava26-apps-api` and is no longer part of default `ava26` dev/build/lint/typecheck.
- Shared packages (`@ava/chat-domain`, `@ava/config`) are consumed through workspace dependencies from `packages/*`.

## Auth and session (unchanged paths)

Public/session routes used by the shared auth template and widgets (same paths as before):

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/session` | Current session + role; `401` when unauthenticated |
| `POST` | `/api/auth/session/bootstrap` | Bootstrap flow for session establishment |
| `POST` | `/api/auth/session/logout` | Logout / clear session cookies |

Middleware treats these as public (no bearer requirement on the path alone). Other `/api/*` routes expect a valid session per existing rules.

**Contract docs:** canonical reference is [`../auth.aveyo.com/docs/auth-cookie-contract.md`](../auth.aveyo.com/docs/auth-cookie-contract.md). Env names (`AVA_SESSION_COOKIE_*`, `AVA_ALLOWED_ORIGINS`, `NEXT_PUBLIC_SUPABASE_*`, etc.) are unchanged.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill values
npm run dev
```

Default dev port: **3002** (same as the previous workspace app).

## Scripts

- `npm run dev` — Next dev server (`next dev --webpack`; Turbopack currently fails to resolve `tsconfig` `extends` for this layout)
- `npm run build` / `npm run start` — production build and serve (`build` uses `next build --webpack` for the same reason)
- `npm run lint` / `npm run typecheck` — quality gates
