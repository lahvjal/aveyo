-- Ensure PostgREST exposes the Ava schema so /rest/v1 can query ava.* tables.
-- Without this, calls using Accept-Profile: ava fail with:
--   PGRST106 "Invalid schema: ava"

ALTER ROLE authenticator
SET pgrst.db_schemas = 'public, graphql_public, ava';

NOTIFY pgrst, 'reload config';
