DO $$
BEGIN
  IF to_regnamespace('ava') IS NULL THEN
    RAISE EXCEPTION 'ava schema is missing';
  END IF;
END
$$;

DO $$
DECLARE
  missing_table_count integer;
BEGIN
  SELECT COUNT(*)
  INTO missing_table_count
  FROM (
    VALUES
      ('public', 'profiles'),
      ('public', 'departments'),
      ('public', 'custom_kpis'),
      ('public', 'goals'),
      ('public', 'section_order'),
      ('ava', 'customer_profiles'),
      ('ava', 'conversations'),
      ('ava', 'messages'),
      ('ava', 'handoff_requests'),
      ('ava', 'handoff_events')
  ) AS expected(schema_name, table_name)
  LEFT JOIN pg_class c
    ON c.relname = expected.table_name
  LEFT JOIN pg_namespace n
    ON n.oid = c.relnamespace
   AND n.nspname = expected.schema_name
  WHERE n.oid IS NULL;

  IF missing_table_count > 0 THEN
    RAISE EXCEPTION 'Expected tables are missing: %', missing_table_count;
  END IF;
END
$$;

DO $$
DECLARE
  no_rls_count integer;
BEGIN
  SELECT COUNT(*)
  INTO no_rls_count
  FROM (
    VALUES
      ('public', 'profiles'),
      ('public', 'departments'),
      ('public', 'custom_kpis'),
      ('public', 'goals'),
      ('public', 'section_order'),
      ('ava', 'customer_profiles'),
      ('ava', 'conversations'),
      ('ava', 'messages'),
      ('ava', 'handoff_requests'),
      ('ava', 'handoff_events')
  ) AS expected(schema_name, table_name)
  JOIN pg_namespace n
    ON n.nspname = expected.schema_name
  JOIN pg_class c
    ON c.relnamespace = n.oid
   AND c.relname = expected.table_name
  WHERE c.relrowsecurity = false;

  IF no_rls_count > 0 THEN
    RAISE EXCEPTION 'RLS is disabled on % expected tables', no_rls_count;
  END IF;
END
$$;

DO $$
DECLARE
  auth_cfg text;
BEGIN
  SELECT cfg
  INTO auth_cfg
  FROM (
    SELECT unnest(COALESCE(rolconfig, ARRAY[]::text[])) AS cfg
    FROM pg_roles
    WHERE rolname = 'authenticator'
  ) AS configs
  WHERE cfg LIKE 'pgrst.db_schemas=%'
  LIMIT 1;

  IF auth_cfg IS NULL THEN
    RAISE EXCEPTION 'authenticator role has no pgrst.db_schemas setting';
  END IF;

  IF POSITION('ava' IN auth_cfg) = 0 THEN
    RAISE EXCEPTION 'ava schema is not exposed via pgrst.db_schemas: %', auth_cfg;
  END IF;
END
$$;

DO $$
DECLARE
  dept_count integer;
  kpi_count integer;
BEGIN
  SELECT COUNT(*)
  INTO dept_count
  FROM public.departments
  WHERE name IN ('Sales', 'Customer Care', 'Operations', 'Finance');

  IF dept_count < 4 THEN
    RAISE EXCEPTION 'Department seed incomplete. Expected 4, found %', dept_count;
  END IF;

  SELECT COUNT(*)
  INTO kpi_count
  FROM public.custom_kpis
  WHERE kpi_id = 'seed_pipeline_health';

  IF kpi_count < 1 THEN
    RAISE EXCEPTION 'Seed KPI missing';
  END IF;
END
$$;

SELECT 'nonprod_smoke_ok' AS status;
