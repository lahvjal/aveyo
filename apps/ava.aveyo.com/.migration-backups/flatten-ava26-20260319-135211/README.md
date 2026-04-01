# Ava Next.js Workspace

Web-first scaffold for:

- support dashboard + widget surface (`apps/rep-web`)
- shared packages (`packages/*`)

The **browser API / BFF** now lives in the sibling repo [`../api.aveyo.com`](../api.aveyo.com) (codebase of record). A frozen copy remains at `apps/api` for short-term rollback only; it is not part of default workspace install targets—use the `*:api:legacy` scripts if you need it.

## Workspace layout

- `apps/rep-web`: rep queue dashboard, `/ava` widget surface, `/widget` alias, and embed script (`/embed.js`)
- `apps/api`: **legacy rollback mirror** of the API (not in `workspaces`; install with `npm install` inside that folder when needed)
- `packages/chat-domain`: shared message types and handoff transitions
- `packages/ui`: shared tokens and primitives
- `packages/config`: shared tsconfig presets

## Run locally

```bash
npm install
npm run dev
```

Rep web only. Run the centralized API from the sibling app:

```bash
npm run dev:api
```

Legacy rollback API (old tree):

```bash
cd apps/api && npm install && npm run dev
# or from repo root:
npm run dev:api:legacy
```

Individual apps:

```bash
npm run dev:rep
npm run dev:api
npm run dev:api:legacy
```

Ports:

- rep web: `http://localhost:3001`
- api (canonical): `http://localhost:3002` — see `../api.aveyo.com`

## Auth and Cookie Contract

See `docs/auth-cookie-contract.md` for the enforced `.aveyo.com` cookie contract,
Supabase env variables, and cross-origin API allowlist configuration.

`apps/rep-web` follows the standardized app auth template:

- `lib/auth/config.ts`
- `lib/auth/session.ts`
- `lib/auth/use-auth-session.ts`

This keeps auth integration plug-and-play for new apps that join the platform.

## Environment Rollout (Dev/Staging/Prod)

Platform/auth rollout ownership has moved to dedicated subdomain workspaces:

- `../app.aveyo.com` for shared platform/Supabase orchestration
- `../auth.aveyo.com` for auth callback + session contract operations
- `../api.aveyo.com` for the centralized API / BFF

Legacy `npm run supabase:*` commands in this repo still work and now delegate to those folders.

## Figma workflow

See `docs/figma-token-flow.md` and update mappings in
`packages/ui/src/figma-map.ts` as MCP node links are provided.
