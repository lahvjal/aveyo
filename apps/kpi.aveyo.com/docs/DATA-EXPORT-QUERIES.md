# KPI Data Export Queries

Run these queries in the **current KPI Supabase project** SQL editor
(`https://nxvnsquhtyipqeotqdpo.supabase.co`) to export existing data.

Save each result as a CSV and share with the org-chart team for import
into `https://semzdcsumfnmjnhzhtst.supabase.co`.

---

## 1. custom_kpis

```sql
SELECT
  kpi_id, name, description, format, formula_type, formula,
  field_mappings, available_periods, section_id, is_active,
  is_original, is_hidden, show_goal, display_order,
  secondary_formula, secondary_format
FROM custom_kpis
WHERE is_active = true
ORDER BY display_order, created_at;
```

## 2. goals

```sql
SELECT kpi_id, period, value
FROM goals
ORDER BY kpi_id, period;
```

## 3. section_order

```sql
SELECT section_id, display_order, is_active
FROM section_order
ORDER BY display_order;
```

---

## Importing into org-chart Supabase

After running `018_kpi_dashboard_tables.sql`, paste the CSV data into the
org-chart Supabase Table Editor, or use INSERT statements like:

```sql
INSERT INTO custom_kpis (kpi_id, name, ...) VALUES (...) ON CONFLICT (kpi_id) DO NOTHING;
INSERT INTO goals (kpi_id, period, value) VALUES (...) ON CONFLICT (kpi_id, period) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO section_order (section_id, display_order, is_active) VALUES (...) ON CONFLICT (section_id) DO UPDATE SET display_order = EXCLUDED.display_order;
```
