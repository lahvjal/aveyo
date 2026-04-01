-- PostgREST schema cache is built with the db-anon-role.
-- Granting schema/table privileges to anon allows ava.* relations to be discoverable
-- while RLS policies continue to enforce authenticated/support-only access.

GRANT USAGE ON SCHEMA ava TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ava
TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ava
TO anon, authenticated, service_role;

GRANT EXECUTE ON ALL ROUTINES IN SCHEMA ava
TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ava
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
  TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ava
  GRANT USAGE, SELECT ON SEQUENCES
  TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ava
  GRANT EXECUTE ON ROUTINES
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload config';
