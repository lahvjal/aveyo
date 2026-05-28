# Subdomain Environment and Secrets Matrix

This file defines the required runtime variables for each app subdomain and service across `dev`, `staging`, and `prod`.

## Supabase Project Refs

- `dev`: `safebiayjffnkcmtshni`
- `staging`: `awzyvdeyzpblonbzddwa`
- `prod`: `semzdcsumfnmjnhzhtst`

## Subdomain Map

| Environment | auth | api | ava | customer-widget | org-chart | kpi | customer-portal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dev | `https://auth-dev.aveyo.com` | `https://api-dev.aveyo.com` | `https://ava-dev.aveyo.com` | `https://widget-dev.aveyo.com` | `https://org-dev.aveyo.com` | `https://kpi-dev.aveyo.com` | `https://customer-dev.aveyo.com` |
| staging | `https://auth-staging.aveyo.com` | `https://api-staging.aveyo.com` | `https://ava-staging.aveyo.com` | `https://widget-staging.aveyo.com` | `https://org-staging.aveyo.com` | `https://kpi-staging.aveyo.com` | `https://customer-staging.aveyo.com` |
| prod | `https://auth.aveyo.com` | `https://api.aveyo.com` | `https://ava.aveyo.com` | `https://widget.aveyo.com` | `https://org.aveyo.com` | `https://kpi.aveyo.com` | `https://customer.aveyo.com` |

## Variable Contracts by Service

### `api.aveyo.com` (repo: `../api.aveyo.com`; legacy mirror: `../../archive/ava26-apps-api`)

- Public vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Secrets:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL`
  - `OPENAI_API_KEY`
  - `CRON_SECRET` (Vercel cron auth for `/api/internal/ava/automation`)
  - `GOOGLE_CHAT_WEBHOOK_URL` (GChat alert on each new handoff request)
- Security config:
  - `AVA_ALLOWED_ORIGINS`
  - `AVA_SESSION_COOKIE_DOMAIN=.aveyo.com`
  - `AVA_SESSION_COOKIE_SAMESITE=lax`
  - `AVA_SESSION_COOKIE_SECURE=true`
  - `AVA_SESSION_COOKIE_HTTPONLY=true`

### `apps/rep-web`

- Public vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_PLATFORM_API_BASE_URL`
  - `NEXT_PUBLIC_AUTH_APP_URL`

### `apps/customer-widget`

- Public vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_PLATFORM_API_BASE_URL`
  - `NEXT_PUBLIC_AVA_DASHBOARD_PAGE_URL`
  - `NEXT_PUBLIC_AVA_WIDGET_PAGE_URL`

### External app repos in this workspace

- `org.aveyo.com`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_APP_URL`
  - Edge function secrets: `RESEND_API_KEY`, `FROM_EMAIL`, `APP_URL`
- `kpi.aveyo.com`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - MySQL vars (`DB_*`)
- `customer.aveyo.com`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY`
  - `NEXT_PUBLIC_CUSTOMER_URL`

### Standardized Auth Template for New Apps

Use the shared auth template from `auth.aveyo.com`:

- `auth.aveyo.com/docs/auth-template.md`
- `auth.aveyo.com/templates/next-cookie-auth-app/`

Required runtime vars for new cookie-first apps:

- `NEXT_PUBLIC_AUTH_APP_URL`
- `NEXT_PUBLIC_PLATFORM_API_BASE_URL`

## Secret Storage Rules

- Store secrets in deployment platform and CI secret stores, not git.
- Use environment-scoped secret names:
  - `DEV_*` for development
  - `STAGING_*` for staging
  - `PROD_*` for production
- Non-production deployments must not reference production Supabase project refs.
