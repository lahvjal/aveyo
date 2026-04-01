# KPI Migration Guide

## Overview

This guide explains how to migrate built-in KPIs from TypeScript code to the Supabase database, enabling admins to edit any KPI formula through the admin interface.

## Migration Strategy

### Three Types of KPIs

1. **Simple SQL KPIs** - Direct conversion to SQL formulas
2. **Component-Based KPIs** - Break into smaller hidden components, use expressions
3. **Goal KPIs** - Simple goal value fetch from Supabase

---

## 1. Simple SQL KPIs

These KPIs have straightforward SQL queries with no complex logic.

### Conversion Pattern

**TypeScript Code:**
```typescript
export async function getTotalSales(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`contract-signed`', period);
  
  const sql = `
    SELECT COUNT(*) as value
    FROM \`timeline\` t
    LEFT JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ value: number }>(sql);
  return {
    value: result?.value || 0,
    formatted: formatNumber(result?.value || 0)
  };
}
```

**Database Record:**
```sql
INSERT INTO custom_kpis (
  kpi_id, name, description, format, formula_type, formula,
  available_periods, section_id, is_original, is_active
) VALUES (
  'total_sales',
  'Total Sales',
  'Number of residential contracts sold',
  'number',
  'sql',
  'SELECT COUNT(*) as value
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true
);
```

**Key Changes:**
- Replace `${dateFilter}` with `{{dateFilter}}` placeholder
- Escape single quotes in formula (`'` becomes `''`)
- Remove TypeScript function wrapping
- Set `is_original = true` and `is_active = true`
- Use `field_mappings` to specify dateField if non-standard

### Examples of Simple SQL KPIs

- `total_sales` - Count contracts with contract-signed date
- `aveyo_approved` - Count distinct projects with SOW approved
- `jobs_on_hold` - Count projects with On Hold status
- `installs_complete` - Count completed installations
- `install_complete_no_pto` - Count installs without PTO
- `install_scheduled` - Count scheduled installations
- `active_no_pto` - Count active projects without PTO
- `pto_received_count` - Count PTOs received in period
- `active_install_not_started` - Count active without install appointment

---

## 2. Component-Based KPIs

Complex KPIs that run multiple queries or combine results should be broken into component KPIs.

### Pattern: A/R M2/M3

**Current TypeScript** (runs 3 queries):
```typescript
export async function getARM2M3(period: TimePeriod): Promise<KPIValue> {
  // Query 1: M2 outstanding
  const m2Sql = `SELECT SUM(f.\`contract-price\` * 0.8) as m2_total FROM funding f ...`;
  const m2Result = await queryOne<any>(m2Sql);
  
  // Query 2: M3 outstanding
  const m3Sql = `SELECT SUM(f.\`contract-price\` * 0.2) as m3_total FROM funding f ...`;
  const m3Result = await queryOne<any>(m3Sql);
  
  // Query 3: Project counts
  const countSql = `SELECT COUNT(DISTINCT f.project_ids) as project_count FROM funding f ...`;
  const countResult = await queryOne<any>(countSql);
  
  const value = (m2Result?.m2_total || 0) + (m3Result?.m3_total || 0);
  
  return {
    value,
    formatted: formatCurrency(value),
    secondaryValue: countResult?.project_count || 0,
    secondaryFormatted: `${projectCount} projects (${m2Count} M2, ${m3Count} M3)`
  };
}
```

**Database Approach:**

**Step 1: Create Component KPIs** (hidden):

```sql
-- Component 1: M2 Outstanding Amount
INSERT INTO custom_kpis VALUES (
  'ar_m2_outstanding',
  'M2 Outstanding',
  'M2 milestone amount submitted but not received',
  'currency',
  'sql',
  'SELECT SUM(f.`contract-price` * 0.8) as value
   FROM funding f
   LEFT JOIN `timeline` t ON f.project_ids = t.`project-dev-id`
   WHERE f.`m2-submitted-date` IS NOT NULL
     AND f.`m2-received-date` IS NULL
     AND f.`project-status-2` IN (''Active'', ''New Lender'', ''Finance Hold'', ''Pre-Approvals'')
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'residential_financials',
  true,  -- is_original
  true,  -- is_active
  true,  -- is_hidden (component KPI)
  NULL,  -- secondary_formula
  NULL   -- secondary_format
);

-- Component 2: M3 Outstanding Amount
INSERT INTO custom_kpis VALUES (
  'ar_m3_outstanding',
  'M3 Outstanding',
  'M3 milestone amount submitted but not received',
  'currency',
  'sql',
  'SELECT SUM(f.`contract-price` * 0.2) as value
   FROM funding f
   LEFT JOIN `timeline` t ON f.project_ids = t.`project-dev-id`
   WHERE f.`m3-submitted-date` IS NOT NULL
     AND f.`m3-received-date` IS NULL
     AND f.`project-status-2` IN (''Active'', ''New Lender'', ''Finance Hold'', ''Pre-Approvals'')
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'residential_financials',
  true,  -- is_original
  true,  -- is_active
  true,  -- is_hidden
  NULL,
  NULL
);
```

**Step 2: Create Parent KPI** (visible, uses components):

```sql
INSERT INTO custom_kpis VALUES (
  'ar_m2_m3',
  'A/R (M2/M3 Submitted Not Received)',
  'Outstanding accounts receivable from M2 and M3 milestones',
  'currency',
  'expression',
  '@ar_m2_outstanding + @ar_m3_outstanding',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'residential_financials',
  true,  -- is_original
  true,  -- is_active
  false, -- is_hidden (visible on dashboard)
  'SELECT 
    COUNT(DISTINCT f.project_ids) as total_count,
    SUM(CASE WHEN f.`m2-submitted-date` IS NOT NULL AND f.`m2-received-date` IS NULL THEN 1 ELSE 0 END) as m2_count,
    SUM(CASE WHEN f.`m3-submitted-date` IS NOT NULL AND f.`m3-received-date` IS NULL THEN 1 ELSE 0 END) as m3_count
   FROM funding f
   LEFT JOIN `timeline` t ON f.project_ids = t.`project-dev-id`
   WHERE f.`project-status-2` IN (''Active'', ''New Lender'', ''Finance Hold'', ''Pre-Approvals'')
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND ((f.`m2-submitted-date` IS NOT NULL AND f.`m2-received-date` IS NULL)
       OR (f.`m3-submitted-date` IS NOT NULL AND f.`m3-received-date` IS NULL))',
  'breakdown'  -- Format as breakdown showing M2 and M3 counts
);
```

**Benefits:**
- M2 and M3 amounts can be tracked independently
- Components are reusable in other KPIs
- Easier to debug and maintain
- Can show/hide components as needed

### Examples of Component-Based KPIs

- `ar_m2_m3` → `ar_m2_outstanding` + `ar_m3_outstanding`
- `revenue_received` → `revenue_m1` + `revenue_m2`
- `pull_through_rate` → `install_complete_count` / `total_sales` * 100
- `battery_percentage` → `battery_count` / `total_sales` * 100
- `packet_approval_percentage` → `packet_approval_count` / `total_sales` * 100

---

## 3. Goal KPIs

Goal KPIs fetch values from the Supabase goals table.

### Pattern

**TypeScript Code:**
```typescript
export async function getTotalSalesGoal(period: TimePeriod): Promise<KPIValue> {
  const goal = await getGoal('total_sales', period);
  return {
    value: goal || 0,
    formatted: formatNumber(goal || 0)
  };
}
```

**Database Record:**
```sql
INSERT INTO custom_kpis VALUES (
  'total_sales_goal',
  'Total Sales Goal',
  'Target number of sales for the selected period',
  'number',
  'sql',
  'SELECT value FROM goals WHERE kpi_id = ''total_sales'' AND period = ''{{period}}''',
  '{"period": "current_period"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true,
  true,  -- hidden (only used for goal comparison)
  NULL,
  NULL
);
```

**Note:** Goal KPIs need special handling for period parameter since goals are stored per-period.

---

## Special Cases

### KPIs with Secondary Values

For KPIs that display both a primary value and secondary information (like project counts):

```sql
INSERT INTO custom_kpis VALUES (
  'revenue_received',
  'Revenue Received',
  'Payments received in period from M1 and M2 milestones',
  'currency',
  'expression',
  '@revenue_m1 + @revenue_m2',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'residential_financials',
  true,
  true,
  false,
  -- Secondary formula to show project count
  'SELECT COUNT(DISTINCT pd.`project-dev-id`) as value
   FROM `project-data` pd
   LEFT JOIN `timeline` t ON pd.`project-dev-id` = t.`project-dev-id`
   WHERE ((pd.`m1-received-date` IS NOT NULL AND {{dateFilter}})
      OR (pd.`m2-received-date` IS NOT NULL AND {{dateFilter}}))
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  'count'  -- Format as "X projects"
);
```

### KPIs with Percentage Calculations

```sql
INSERT INTO custom_kpis VALUES (
  'pull_through_rate',
  'Pull Through Rate',
  'Jobs with Install Complete / Total Jobs (for selected period)',
  'percentage',
  'sql',
  'SELECT 
    (COUNT(CASE WHEN t.`install-complete` IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)) as value
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true,
  false,
  'SELECT 
    COUNT(CASE WHEN t.`install-complete` IS NOT NULL THEN 1 END) as complete_count,
    COUNT(*) as total_count
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  'breakdown'  -- Shows "X of Y jobs"
);
```

### Rolling Average KPIs

```sql
INSERT INTO custom_kpis VALUES (
  'pull_through_rolling_6m',
  'Pull Through % (Rolling 6M)',
  'Percentage of jobs sold 61-180 days ago that reached install complete',
  'percentage',
  'sql',
  'SELECT 
    (COUNT(CASE WHEN t.`install-complete` IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)) as value
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` BETWEEN DATE_SUB(CURDATE(), INTERVAL 180 DAY) AND DATE_SUB(CURDATE(), INTERVAL 61 DAY)
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true,
  false,
  NULL,
  NULL
);
```

---

## Conversion Checklist

For each KPI, follow these steps:

1. **Identify Type**
   - [ ] Simple SQL?
   - [ ] Needs components?
   - [ ] Goal KPI?

2. **Extract SQL**
   - [ ] Copy SQL from TypeScript function
   - [ ] Replace `${dateFilter}` with `{{dateFilter}}`
   - [ ] Escape single quotes (`'` → `''`)
   - [ ] Remove template literals and TypeScript syntax

3. **Handle Secondary Values**
   - [ ] Does KPI show project count or breakdown?
   - [ ] Create secondary_formula if needed
   - [ ] Choose secondary_format (count/breakdown/text)

4. **Create Components (if needed)**
   - [ ] Identify independent calculations
   - [ ] Create component KPIs (is_hidden = true)
   - [ ] Use expression formula in parent KPI

5. **Test Formula**
   - [ ] Use KPI admin interface
   - [ ] Test with different time periods
   - [ ] Verify values match TypeScript version

6. **Document**
   - [ ] Note any special considerations
   - [ ] Document dependencies
   - [ ] Update field_mappings if needed

---

## Field Mappings

Use `field_mappings` for configuration:

```json
{
  "dateField": "t.`custom-date-field`",  // Override default date field
  "period": "current_period",             // For goal KPIs
  "customConfig": "any value"             // Custom configuration
}
```

---

## Testing Strategy

1. **Compare Values**
   - Run TypeScript version: `await getTotalSales('mtd')`
   - Run database version: `await getKPIValue('total_sales', 'mtd')`
   - Values should match within rounding

2. **Test All Periods**
   - current_week
   - previous_week
   - mtd
   - ytd
   - next_week (if applicable)

3. **Test Edge Cases**
   - No data for period (should return 0)
   - Missing date fields (should handle gracefully)
   - Null values (should use COALESCE or IS NULL checks)

---

## Common Pitfalls

1. **Escaping Quotes**
   - ❌ `WHERE status = 'Active'`
   - ✅ `WHERE status = ''Active''`

2. **Date Filter Placeholder**
   - ❌ `AND ${dateFilter}`
   - ✅ `AND {{dateFilter}}`

3. **Backtick Escaping**
   - ❌ `FROM @timeline t` (wrong - @ is for field references)
   - ✅ `FROM \`timeline\` t` (correct - escape backticks)

4. **Component Dependencies**
   - ❌ Circular: `kpi_a` references `kpi_b`, `kpi_b` references `kpi_a`
   - ✅ Linear: `kpi_parent` references `kpi_child1` + `kpi_child2`

5. **NULL Handling**
   - ❌ `SUM(contract-price)` (returns NULL if all NULLs)
   - ✅ `COALESCE(SUM(contract-price), 0)` (returns 0)

---

## Migration Order

Suggested order for migrating KPIs:

1. **Phase 1: Simple Metrics**
   - total_sales
   - installs_complete
   - jobs_on_hold
   - active_no_pto
   - pto_received_count

2. **Phase 2: Component Setup**
   - Create component KPIs for M2/M3
   - Create component KPIs for revenue
   - Create component KPIs for counts

3. **Phase 3: Complex Metrics**
   - ar_m2_m3 (using components)
   - revenue_received (using components)
   - pull_through_rate (with breakdown)

4. **Phase 4: Rolling Averages**
   - pull_through_rolling_6m
   - max_pull_through_rolling_6m

5. **Phase 5: Goal KPIs**
   - total_sales_goal
   - install_completion_goal
   - kw_scheduled_goal
   - kw_installed_goal

---

## Rollback Strategy

If a migrated KPI has issues:

1. **Disable in Database**
   ```sql
   UPDATE custom_kpis SET is_active = false WHERE kpi_id = 'problematic_kpi';
   ```

2. **System Falls Back to TypeScript**
   - TypeScript function still exists as fallback
   - Dashboard continues working

3. **Fix and Re-enable**
   - Fix formula in admin interface
   - Test thoroughly
   - Re-enable: `UPDATE custom_kpis SET is_active = true WHERE kpi_id = 'fixed_kpi';`

---

## Quick Reference

| KPI Type | Formula Type | Hidden | Secondary Formula |
|----------|--------------|--------|-------------------|
| Simple SQL | sql | false | optional |
| Component | sql | true | no |
| Parent (uses components) | expression | false | optional |
| Goal | sql | true | no |
| Rolling Average | sql | false | no |

---

**Last Updated:** 2026-01-28  
**Version:** 1.0.0
