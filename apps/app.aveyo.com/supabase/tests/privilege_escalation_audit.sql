-- Incident audit checks for privilege-escalation hardening.
-- Run with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/privilege_escalation_audit.sql

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles', 'departments', 'audit_logs', 'goals', 'processes'] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = tbl
          AND c.relrowsecurity = TRUE
      ) THEN
        RAISE EXCEPTION '% must have RLS enabled', tbl;
      END IF;
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.profiles', 'UPDATE')
     OR has_table_privilege('anon', 'public.profiles', 'INSERT')
     OR has_table_privilege('anon', 'public.profiles', 'DELETE') THEN
    RAISE EXCEPTION 'anon must not have DML privilege on public.profiles';
  END IF;

  IF has_table_privilege('anon', 'public.audit_logs', 'UPDATE')
     OR has_table_privilege('anon', 'public.audit_logs', 'INSERT')
     OR has_table_privilege('anon', 'public.audit_logs', 'DELETE') THEN
    RAISE EXCEPTION 'anon must not have DML privilege on public.audit_logs';
  END IF;
END;
$$;

DO $$
DECLARE
  v_check TEXT;
BEGIN
  SELECT with_check
  INTO v_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'Users can update their own profile';

  IF v_check IS NULL THEN
    RAISE EXCEPTION 'Users can update their own profile policy is missing';
  END IF;

  IF position('is_admin' IN v_check) = 0
     OR position('is_super_admin' IN v_check) = 0
     OR position('is_executive' IN v_check) = 0
     OR position('is_manager' IN v_check) = 0 THEN
    RAISE EXCEPTION 'profiles self-update policy is missing privileged field checks';
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND cmd IN ('DELETE', 'UPDATE')
  ) THEN
    RAISE EXCEPTION 'audit_logs must not allow UPDATE or DELETE policies';
  END IF;
END;
$$;

DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.terminate_employee(uuid,uuid,uuid,timestamptz,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must NOT have EXECUTE on terminate_employee';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.terminate_employee(uuid,uuid,uuid,timestamptz,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must have EXECUTE on terminate_employee';
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'ava') THEN
    IF has_schema_privilege('anon', 'ava', 'USAGE') THEN
      RAISE EXCEPTION 'anon must not retain USAGE on ava schema';
    END IF;
  END IF;
END;
$$;

SELECT 'privilege escalation audit checks passed' AS result;
