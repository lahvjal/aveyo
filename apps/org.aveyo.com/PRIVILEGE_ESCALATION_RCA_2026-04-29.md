# Privilege Escalation RCA (2026-04-29)

## Incident Summary
- A user was able to escalate privileges and obtain admin access after the latest update.
- The exploit path matched direct Supabase REST table mutation behavior (`profiles` role flags), which should have been blocked by hardened RLS and grants.

## Root Cause
- **Primary:** production policy/grant drift relative to the hardened migration baseline.
- **Contributing control gap:** CI allowed security-sensitive migration changes to merge without mandatory SQL authz checks when path filters or missing `DATABASE_URL` caused checks to skip.
- **Why it resurfaced today:** the latest update changed Supabase-adjacent surfaces, but existing guardrails did not enforce strict migration drift detection plus required SQL authz execution for those paths.

## Evidence Anchors
- Hardened policy/grant baseline already exists in:
  - `apps/app.aveyo.com/supabase/migrations/030_auth_hardening.sql`
  - `apps/app.aveyo.com/supabase/migrations/035_harden_internal_employee_read_policies.sql`
- Known risky grant sequence that must be ordered correctly:
  - `apps/app.aveyo.com/supabase/migrations/038_ava_schema_api_grants_for_anon.sql`
  - `apps/app.aveyo.com/supabase/migrations/042_harden_ava_schema_grants.sql`

## Remediation Implemented
- Added emergency SQL hotfix migrations:
  - `apps/app.aveyo.com/supabase/migrations/057_privilege_escalation_hotfix.sql`
  - `apps/org.aveyo.com/supabase/migrations/036_privilege_escalation_hotfix.sql`
- Added incident audit SQL checks:
  - `apps/app.aveyo.com/supabase/tests/privilege_escalation_audit.sql`
- Hardened edge admin operation containment:
  - `apps/org.aveyo.com/supabase/functions/admin-user-ops/index.ts`
  - role mutations are now super-admin-only, with incident lockdown gate.
- Added exploit replay script:
  - `apps/app.aveyo.com/scripts/supabase/replay-privilege-escalation-check.mjs`
- Enforced CI guardrails for security-sensitive paths:
  - `apps/app.aveyo.com/supabase/**` now triggers org authz + SQL authz workflow jobs.
  - SQL authz no longer silently skips due to missing `DATABASE_URL` in relevant CI job.
  - strict migration drift check is now required via dedicated CI job.

## Prevention Controls
- Keep migration drift enforcement strict (`STRICT_MIGRATION_DRIFT=true`) for CI.
- Treat missing SQL authz database credentials as a failing condition for security-sensitive changes.
- Keep explicit regression checks for:
  - anon profile DML denial,
  - append-only audit logs,
  - privileged role field immutability for non-super-admin actors.

## Follow-up Verification
- Run SQL authz checks against staging and production pooler connections.
- Replay exploit with anon credentials and confirm 401/403 denial.
- Confirm migration history includes hotfix migration and expected ordering around 038/042 on target projects.
