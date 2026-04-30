-- Emergency privilege-escalation hotfix.
-- Reasserts critical RLS posture and hardened policy/grant invariants.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles', 'departments', 'audit_logs', 'goals', 'processes'] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END;
$$;

-- Keep anonymous clients from mutating sensitive tables even if grants drift.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.audit_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.departments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.processes FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.goals FROM anon;

-- Reassert hardened self-update policy.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND EXISTS (
      SELECT 1
      FROM public.profiles existing
      WHERE existing.id = public.profiles.id
        AND public.profiles.is_admin IS NOT DISTINCT FROM existing.is_admin
        AND public.profiles.is_manager IS NOT DISTINCT FROM existing.is_manager
        AND public.profiles.is_executive IS NOT DISTINCT FROM existing.is_executive
        AND public.profiles.is_super_admin IS NOT DISTINCT FROM existing.is_super_admin
        AND public.profiles.is_process_editor IS NOT DISTINCT FROM existing.is_process_editor
        AND public.profiles.manager_id IS NOT DISTINCT FROM existing.manager_id
        AND public.profiles.department_id IS NOT DISTINCT FROM existing.department_id
        AND public.profiles.employment_status IS NOT DISTINCT FROM existing.employment_status
        AND public.profiles.terminated_at IS NOT DISTINCT FROM existing.terminated_at
        AND public.profiles.termination_effective_at IS NOT DISTINCT FROM existing.termination_effective_at
        AND public.profiles.termination_reason IS NOT DISTINCT FROM existing.termination_reason
        AND public.profiles.terminated_by IS NOT DISTINCT FROM existing.terminated_by
        AND public.profiles.archived_at IS NOT DISTINCT FROM existing.archived_at
    )
  );

-- Reassert manager update scope policy.
DROP POLICY IF EXISTS "Managers can update their team" ON public.profiles;
CREATE POLICY "Managers can update their team"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles actor
      WHERE actor.id = auth.uid()
        AND actor.is_manager = TRUE
    )
    AND public.profiles.id IN (SELECT id FROM public.get_manager_team(auth.uid()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles actor
      WHERE actor.id = auth.uid()
        AND actor.is_manager = TRUE
    )
    AND public.profiles.id IN (SELECT id FROM public.get_manager_team(auth.uid()))
    AND EXISTS (
      SELECT 1
      FROM public.profiles existing
      WHERE existing.id = public.profiles.id
        AND public.profiles.is_admin IS NOT DISTINCT FROM existing.is_admin
        AND public.profiles.is_manager IS NOT DISTINCT FROM existing.is_manager
        AND public.profiles.is_executive IS NOT DISTINCT FROM existing.is_executive
        AND public.profiles.is_super_admin IS NOT DISTINCT FROM existing.is_super_admin
        AND public.profiles.is_process_editor IS NOT DISTINCT FROM existing.is_process_editor
        AND public.profiles.employment_status IS NOT DISTINCT FROM existing.employment_status
        AND public.profiles.terminated_at IS NOT DISTINCT FROM existing.terminated_at
        AND public.profiles.termination_effective_at IS NOT DISTINCT FROM existing.termination_effective_at
        AND public.profiles.termination_reason IS NOT DISTINCT FROM existing.termination_reason
        AND public.profiles.terminated_by IS NOT DISTINCT FROM existing.terminated_by
        AND public.profiles.archived_at IS NOT DISTINCT FROM existing.archived_at
        AND (
          public.profiles.manager_id IS NULL
          OR public.profiles.manager_id = auth.uid()
          OR public.profiles.manager_id IS NOT DISTINCT FROM existing.manager_id
        )
    )
  );

-- Ensure audit logs are append-only for authenticated actors.
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND changed_by = auth.uid()
  );

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND cmd IN ('DELETE', 'UPDATE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', p.policyname);
  END LOOP;
END;
$$;

-- Reassert privileged function grants.
REVOKE EXECUTE ON FUNCTION public.terminate_employee(UUID, UUID, UUID, TIMESTAMPTZ, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.terminate_employee(UUID, UUID, UUID, TIMESTAMPTZ, TEXT)
  TO service_role;

-- If ava schema exists, keep it unavailable to anon by default.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'ava') THEN
    REVOKE ALL ON SCHEMA ava FROM anon;
  END IF;
END;
$$;
