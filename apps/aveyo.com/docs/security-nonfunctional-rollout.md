# Aveyo Subdomain Security Hardening (Non-Functional Phase)

This runbook applies the current approved scope: security hardening that does not change platform behavior.

## Scope Guardrails

- Do not change auth routing, redirects, or login host selection.
- Do not change API endpoint availability or response contracts.
- Do not change form submission methods or validation behavior.
- Do not enforce CSP yet; use `Content-Security-Policy-Report-Only` only.
- Do not change runtime CORS or cache policy behavior in this phase.

## Implemented Controls in This Phase

- Baseline response headers added via per-app `vercel.json`.
- CSP added in report-only mode.
- `sandbox` attributes added to iframe embeds.
- Header/CORS/cache observability script added:
  - `pnpm run security:headers:check`

## Verification Steps

1. Deploy each touched app to staging.
2. Run:
   - `pnpm run security:headers:check`
3. Manually validate in browser:
   - `https://aveyo.com`
   - `https://app.aveyo.com`
   - `https://marketing.aveyo.com`
   - `https://org.aveyo.com`
4. Confirm:
   - iframe embeds still render and interact normally.
   - no auth flow or route behavior changed.
   - `Content-Security-Policy-Report-Only` appears on responses.
5. Re-run at production hostnames after deploy.

## CSP Reporting Review

- Capture violation reports for 1-2 weeks.
- Build an allowlist delta from observed legitimate sources.
- Do not switch to enforced CSP until explicit approval is granted.

## Deferred Items (Explicitly Out of Scope)

- KPI auth host migration from staging to production auth.
- API root endpoint gating/hiding.
- Form method changes and CSRF/captcha behavior changes.
- CORS policy enforcement changes.
- Cache policy behavior changes.
- HSTS preload enablement.
