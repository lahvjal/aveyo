# HSTS Preload Readiness Checklist

Use this checklist before enabling:

`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

## Why this is gated

HSTS preload is effectively irreversible in the short term and applies to all subdomains. If any active subdomain is not HTTPS-clean, users can be locked out.

## Required checks

- [ ] All production subdomains terminate HTTPS successfully with valid certificates.
- [ ] No active production subdomain requires HTTP for any endpoint or callback.
- [ ] Redirect chains from apex and `www` are fully HTTPS end-to-end.
- [ ] Auth callback URLs and return URLs are HTTPS-only in all environments.
- [ ] Embedded third-party resources are HTTPS-only and stable.
- [ ] Emergency rollback plan is documented and owned.

## Validation commands

Run from repo root:

```bash
for host in \
  auth.aveyo.com api.aveyo.com app.aveyo.com org.aveyo.com \
  marketing.aveyo.com kpi.aveyo.com aveyo.com www.aveyo.com; do
  echo "\n## https://$host"
  curl -sSI "https://$host" | awk 'BEGIN{IGNORECASE=1} /^HTTP\// || /^location:/ || /^strict-transport-security:/'
done
```

## Decision

- Keep current HSTS policy (`max-age=63072000`) until all checks above pass.
- Only then enable `includeSubDomains; preload` and submit to <https://hstspreload.org/>.
