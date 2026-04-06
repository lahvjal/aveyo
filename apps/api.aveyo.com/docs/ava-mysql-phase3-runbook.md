# Ava MySQL Phase 3 Runbook

Phase 3 hardens Ava's MySQL-backed project retrieval with:

- in-memory TTL caching for repeat lookups
- project-selection telemetry for debugging multi-project conversations
- optional DBA-managed index recommendations to reduce query latency

## Read-Only MySQL Mode

This integration assumes the API has **read-only access** to MySQL.

- Ava code does not perform inserts, updates, deletes, or schema changes in MySQL.
- If your team cannot run migrations or create indexes, the system still works.
- In read-only mode, performance tuning happens primarily through cache TTL and cache size.

## Runtime Controls

These environment variables are optional. Defaults are safe for local and staging.

- `AVA_MYSQL_LOOKUP_CACHE_TTL_MS` (default `30000`)
- `AVA_MYSQL_LOOKUP_CACHE_MAX_ENTRIES` (default `2000`)
- `AVA_MYSQL_CONTEXT_CACHE_TTL_MS` (default `20000`)
- `AVA_MYSQL_CONTEXT_CACHE_MAX_ENTRIES` (default `1500`)
- `AVA_MYSQL_TELEMETRY` (`0` disables MySQL lookup telemetry; default enabled)
- `AVA_PROJECT_SELECTION_TELEMETRY` (`0` disables project pinning telemetry; default enabled)

### Suggested Read-Only Tuning Profile

If MySQL is read-only and cannot be indexed by your team, start with:

- `AVA_MYSQL_LOOKUP_CACHE_TTL_MS=60000`
- `AVA_MYSQL_CONTEXT_CACHE_TTL_MS=45000`
- keep telemetry enabled initially, then disable once stable if log volume is high

## Optional DBA-Managed MySQL Indexes

The current `project-data` access path filters by `is_deleted` and identity keys (`project-id`, `customer-id`, `email`) with recency ordering.

If your DBA/platform team can apply schema changes, these indexes are recommended in a low-traffic window:

```sql
CREATE INDEX idx_project_data_active_project_ref
  ON `project-data` (`is_deleted`, `project-id`, `item_id`);

CREATE INDEX idx_project_data_active_customer_ref
  ON `project-data` (`is_deleted`, `customer-id`, `item_id`);

CREATE INDEX idx_project_data_active_email_ref
  ON `project-data` (`is_deleted`, `email`, `item_id`);

CREATE INDEX idx_timeline_active_project_ref
  ON `timeline` (`is_deleted`, `project-id`, `item_id`);

CREATE INDEX idx_customer_sow_active_project_status_due
  ON `customer-sow`
  (`is_deleted`, `project-id`, `customer-portal-sow-status`, `status`, `customer-sow-due-date`, `item_id`);
```

## Rollout Checklist

1. Deploy API with Phase 3 code changes.
2. Observe logs for:
   - `[ava-mysql] get-customer-project-details`
   - `[ava-mysql] list-identity-projects`
   - `[ava-mysql-context] get-project-context-snapshot`
   - `[ava-project-selection] resolve-project-ref`
3. Tune cache TTL/entry limits for your traffic profile.
4. If DBA access exists, request the optional indexes above; otherwise skip.
5. Verify cache hit rates and latency reduction over 24 hours.
6. If logs are too noisy, set `AVA_MYSQL_TELEMETRY=0` and/or `AVA_PROJECT_SELECTION_TELEMETRY=0`.
