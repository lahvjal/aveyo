# Ava Next.js App

Web-first app root for:

- support dashboard + widget surfaces (`/ava`, `/embed`, and `/widget` alias)
- shared workspace packages from `../../packages/*`

The **browser API / BFF** lives in the sibling repo [`../api.aveyo.com`](../api.aveyo.com) (codebase of record). A frozen copy remains in `../../archive/ava26-apps-api` for short-term rollback only.

## Repository layout

- `app`, `components`, `lib`, `public`: root Next.js app (dashboard, widget routes, and embed surface)
- `../../packages/chat-domain`: shared message types and handoff transitions
- `../../packages/ui`: shared tokens and primitives
- `../../packages/config`: shared tsconfig presets

## Run locally

```bash
npm install
npm run dev
```

Run the centralized API from the sibling app:

```bash
npm run dev:api
```

Legacy rollback API (archived):

```bash
cd ../../archive/ava26-apps-api && npm install && npm run dev
```

Common commands:

```bash
npm run dev
npm run dev:rep
npm run dev:api
```

Ports:

- app: `http://localhost:3001`
- api (canonical): `http://localhost:3002` — see `../api.aveyo.com`

## Auth and Cookie Contract

See `docs/auth-cookie-contract.md` for the enforced `.aveyo.com` cookie contract,
Supabase env variables, and cross-origin API allowlist configuration.

The root app follows the standardized auth template:

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
