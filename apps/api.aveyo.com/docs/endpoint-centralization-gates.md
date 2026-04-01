# Endpoint Centralization Gates

Use this policy to decide whether an endpoint belongs in `api.aveyo.com` (platform API) or should stay in an app-local API/BFF.

## Gate Rules (all required)

An endpoint can move to platform API only when **all** are true:

1. **Cross-app reuse**
   - Used by at least 2 first-party apps, or
   - Planned near-term adoption by a second app within one release window.
2. **Stable contract**
   - Request/response shape is versioned or otherwise backward-compatible.
   - Consumer behavior will not require weekly breaking changes.
3. **Clear ownership and SLO**
   - Named owning team in platform API.
   - Error budget/SLO and on-call path are defined.
4. **Measured duplication reduction**
   - Move removes duplicated logic from multiple app codebases.
   - Benefit is measurable (maintenance hours, bug count, or release simplification).

If any gate is false, keep the endpoint local for now.

## Keep Local By Default

Keep endpoint in app-domain API when it is:

- Product-specific and not reused.
- Rapidly changing or experimental.
- Tight-coupled to one app’s private schema or release cadence.
- Hard to abstract without leaking product-only assumptions.

## Intake Checklist

Before proposing centralization, fill this checklist:

- Endpoint path and method:
- Current app owner:
- Consumer apps (current + planned):
- Shared contract doc link:
- Backward compatibility plan:
- Rollback plan:
- Owner + pager/on-call:
- SLO target:
- Duplication removed (files/modules):
- Cutover wave (dev/staging/prod):

## Cutover Requirements

- Keep old endpoint behavior unchanged during migration window.
- Run dual-read or shadow validation when feasible.
- Add contract tests for new centralized endpoint.
- Publish migration note to consumer apps.
- Define rollback trigger and restore procedure.
