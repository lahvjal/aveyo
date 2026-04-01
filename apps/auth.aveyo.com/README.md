# auth.aveyo.com Auth Workspace

This workspace owns shared authentication contracts and callback orchestration:

- subdomain auth redirect/callback policy
- Supabase auth callback config apply/verify
- cross-subdomain session/CORS verification
- hosted login entrypoint (`/login`) for cookie session bootstrap

The centralized session/API authority is the sibling app:

- `../api.aveyo.com` (codebase of record for `/api/auth/session*` and shared cookie policy)

## Commands

```bash
npm run dev
npm run build

npm run supabase:auth:callbacks:dev
npm run supabase:auth:callbacks:staging
npm run supabase:auth:verify:dev
npm run supabase:session:verify
```

## Config

- callback map: `config/auth-callbacks.json`
- cookie/session contract: `docs/auth-cookie-contract.md`
- login app env template: `.env.example`
- new app auth template standard: `docs/auth-template.md`
- copyable starter files: `templates/next-cookie-auth-app/`
