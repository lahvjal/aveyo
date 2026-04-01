# KPI Dashboard — Deployment Checklist

## 1. Supabase (org-chart project)

- [ ] Run `supabase-migrations/00-complete-migration.sql` in the org-chart Supabase SQL editor
  - URL: `https://semzdcsumfnmjnhzhtst.supabase.co`
- [ ] Import KPI data using queries from `docs/DATA-EXPORT-QUERIES.md`
  - custom_kpis
  - goals
  - section_order
- [ ] Verify existing KPI admin users have `profiles.is_admin = true` in the org-chart Supabase
- [ ] In Supabase dashboard → **Authentication → URL Configuration**:
  - Add `https://kpi.aveyo.com` to **Redirect URLs**
  - Add `https://orgchart.aveyo.com` to **Redirect URLs** (if not already present)

## 2. Vercel — KPI Dashboard project

- [ ] Update environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL    = https://semzdcsumfnmjnhzhtst.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY = <org-chart anon key>
  SUPABASE_SERVICE_ROLE_KEY   = <org-chart service role key>
  NEXT_PUBLIC_ORG_CHART_URL   = https://orgchart.aveyo.com
  ```
  MySQL vars stay unchanged.
- [ ] Add custom domain `kpi.aveyo.com` in Vercel project settings
- [ ] Add DNS CNAME record: `kpi` → `cname.vercel-dns.com`
- [ ] Redeploy after env var changes

## 3. Vercel — Org Chart project

- [ ] Add custom domain `orgchart.aveyo.com` in Vercel project settings
- [ ] Add DNS CNAME record: `orgchart` → `cname.vercel-dns.com`

## 4. Testing Checklist

- [ ] Visiting `kpi.aveyo.com` while logged out → redirects to `orgchart.aveyo.com/login`
- [ ] Logging in on org-chart then navigating to `kpi.aveyo.com` → no second login required
- [ ] Non-admin user → sees "Access Restricted" screen with back link
- [ ] Admin user → full KPI dashboard access
- [ ] Logging out on org-chart → KPI dashboard session also invalidated
- [ ] All KPI data loads correctly (MySQL connection unchanged)
- [ ] Goals, custom KPIs, section ordering work (from org-chart Supabase)
- [ ] "← Org Chart" header link navigates correctly
- [ ] "KPI Dashboard" link in org-chart header (admin/executive only) works

## 5. Local Development Notes

Cookie sharing **does not work** across `localhost:3000` (KPI) and `localhost:5173` (org-chart)
because cookies can't span different ports on localhost.

To test auth flow locally:
1. Log in on the org-chart app at `localhost:5173`
2. The KPI app at `localhost:3000` will **redirect to localhost:5173/login** (expected)
3. To bypass for local KPI dev only, temporarily hardcode a test user in auth-provider.tsx

In production on `*.aveyo.com` subdomains, shared cookies work automatically.
