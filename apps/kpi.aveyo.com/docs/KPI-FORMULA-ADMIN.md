# KPI Formula Admin

## Overview

The KPI Formula Admin feature allows administrators to create, edit, and manage custom KPI metrics with dynamic formulas. This powerful system enables non-technical users to define new metrics without modifying code.

## Features

### 1. **Admin Dashboard** (`/kpis`)
- View all KPIs (built-in and custom)
- Search and filter by section
- Create new custom KPIs
- Edit existing custom KPIs
- Delete custom KPIs
- Authentication required (Supabase)

### 2. **Formula Editor**
- Rich text editor with syntax highlighting
- `@` autocomplete for database fields
- Real-time formula validation
- Support for SQL queries and JavaScript expressions
- Visual feedback (errors, warnings, parsed fields)

### 3. **Field Reference Panel**
- Searchable database schema browser
- Organized by table
- Type badges and descriptions
- One-click field token copying
- Collapsible table sections

### 4. **Formula Templates**
- Pre-built templates for common patterns:
  - Count Metrics
  - Average Days
  - Percentage Calculations
  - Sum with Joins
  - Complex Calculations
  - Rolling Averages

### 5. **Formula Testing**
- Test formulas before saving
- Select time period for testing
- View calculated results
- Error feedback

## Usage Guide

### Accessing the Admin Page

1. Navigate to `/kpis` or click the **Database icon** in the header
2. Sign in with your Supabase credentials
3. The dashboard will display all available KPIs

### Creating a Custom KPI

1. Click **"Create Custom KPI"** button
2. Fill in the form:
   - **KPI ID**: Unique identifier (lowercase, underscores)
   - **Display Name**: Human-readable name
   - **Description**: Optional description
   - **Format**: `number`, `currency`, `percentage`, or `days`
   - **Section**: Which dashboard section to display in
   - **Formula Type**: `SQL` or `Expression`
   - **Formula**: Your calculation logic
   - **Available Periods**: Time periods this KPI supports

3. Write your formula using:
   - **SQL Mode**: Full SQL queries with field tokens
   - **Expression Mode**: JavaScript expressions

4. Test your formula with different time periods
5. Click **"Save KPI"**

### Formula Syntax

#### SQL Formulas

Use `@table.field` tokens to reference database fields:

```sql
SELECT COUNT(*) as value
FROM @timeline t
WHERE t.@contract-signed IS NOT NULL
  AND {{dateFilter}}
```

**Special Tokens:**
- `@table.field` → Replaced with backtick-quoted field names
- `{{dateFilter}}` → Automatically replaced with appropriate date filter for the period

**Example: Total Sales**
```sql
SELECT SUM(pd.@contract-price) as value
FROM @timeline t
JOIN @project-data pd ON t.`project-dev-id` = pd.`project-dev-id`
WHERE t.@contract-signed IS NOT NULL
  AND {{dateFilter}}
```

#### Expression Formulas

Use JavaScript expressions with KPI IDs or SQL queries:

```javascript
@total_revenue / @total_jobs
```

**Variables:**
- Can reference other KPI IDs (e.g., `@total_sales`)
- Can use inline SQL queries wrapped in backticks
- Supports standard math operators: `+`, `-`, `*`, `/`, `%`
- Supports functions: `Math.round()`, `Math.floor()`, etc.

**Example: Conversion Rate**
```javascript
(@total_installs / @total_sales) * 100
```

**Example: With Inline SQL**
```javascript
(@total_revenue - @total_costs) / @total_revenue * 100
```

### Using the Field Reference Panel

1. Click **"Fields"** button in the modal header
2. Search for fields by name, table, or type
3. Browse organized by table
4. Click any field to copy its token
5. Paste into formula editor

### Formula Templates

1. Click **"Templates"** button in the form
2. Browse available templates by type
3. Click a template to auto-populate the formula
4. Customize as needed

### Testing Formulas

1. Write your formula
2. Select a time period from the dropdown
3. Click **"Test Formula"**
4. Review the result:
   - ✅ Success: Shows calculated value
   - ❌ Error: Shows error message

### Editing a Custom KPI

1. Find the KPI in the list
2. Click the **Edit icon** (pencil)
3. Modify fields as needed
4. Test your changes
5. Click **"Save KPI"**

### Deleting a Custom KPI

1. Find the KPI in the list
2. Click the **Delete icon** (trash)
3. Confirm deletion

**Note**: Built-in KPIs cannot be edited or deleted.

## Formula Validation

The system validates formulas for:

### SQL Formulas
- ✅ Contains `SELECT` and `FROM` clauses
- ✅ Field tokens are properly formatted
- ✅ Referenced tables exist in the database
- ❌ Dangerous keywords blocked (DROP, DELETE, etc.)
- ❌ SQL injection patterns

### Expression Formulas
- ✅ Valid JavaScript syntax
- ✅ Balanced parentheses
- ✅ Valid variable references
- ❌ Dangerous functions blocked (eval, Function, etc.)

**Warnings:**
- Missing time period placeholders
- Unused tables
- Complex queries

## Database Schema

### Custom KPIs Table (`custom_kpis`)

```sql
id                 uuid PRIMARY KEY
kpi_id             text UNIQUE NOT NULL
name               text NOT NULL
description        text
format             text CHECK (...)
formula_type       text CHECK ('sql', 'expression')
formula            text NOT NULL
field_mappings     jsonb
available_periods  text[]
section_id         text NOT NULL
is_active          boolean DEFAULT true
created_by         uuid REFERENCES auth.users
created_at         timestamptz
updated_at         timestamptz
```

### Row-Level Security (RLS)

- **Public**: Can read active KPIs
- **Authenticated**: Can create, update, delete KPIs

## API Endpoints

### `GET /api/kpis`
Returns all KPIs (built-in + custom)

**Response:**
```json
{
  "success": true,
  "kpis": {
    "builtIn": [...],
    "custom": [...],
    "total": 150
  }
}
```

### `POST /api/kpis`
Create a new custom KPI

**Headers:**
- Cookie-authenticated request (`credentials: "include"`)

**Body:**
```json
{
  "kpi_id": "my_metric",
  "name": "My Metric",
  "description": "...",
  "format": "currency",
  "formula_type": "sql",
  "formula": "SELECT ...",
  "available_periods": ["current_week", "mtd"],
  "section_id": "sales_stats",
  "field_mappings": {}
}
```

### `PUT /api/kpis`
Update an existing custom KPI

**Headers:**
- Cookie-authenticated request (`credentials: "include"`)

**Body:** Same as POST

### `DELETE /api/kpis?kpi_id=<id>`
Soft-delete a custom KPI (sets `is_active = false`)

**Headers:**
- Cookie-authenticated request (`credentials: "include"`)

### `GET /api/db-schema`
Returns database schema for all tables

**Response:**
```json
{
  "success": true,
  "schema": {
    "timeline": [
      {
        "field": "contract-signed",
        "type": "date",
        "nullable": true,
        "table": "timeline"
      }
    ]
  },
  "metadata": {
    "tableCount": 5,
    "totalFields": 150,
    "tables": [...]
  }
}
```

## Integration with Dashboard

Custom KPIs are automatically:
1. Fetched on dashboard load
2. Displayed in their designated sections
3. Calculated using their defined formulas
4. Cached for performance
5. Refreshed on data updates

### How It Works

```
User visits dashboard
  ↓
getKPIValue(kpiId, period) called
  ↓
Check if custom KPI exists in Supabase
  ↓
If yes → executeCustomKPI()
  ├─ SQL → executeSQLFormula()
  └─ Expression → executeExpressionFormula()
  ↓
If no → fall back to built-in KPI logic
  ↓
Return KPIValue { value, trend, ... }
```

## Security Considerations

### SQL Injection Prevention
- Dangerous keywords are blocked
- All field tokens are properly escaped
- Table names are validated against whitelist
- Queries are executed with restricted permissions

### Expression Safety
- Dangerous functions blocked (`eval`, `Function`)
- Variables validated before evaluation
- Sandboxed execution context
- Limited to mathematical operations

### Authentication
- All write operations require authentication
- Supabase Row-Level Security enforced
- User sessions validated on each request

## Best Practices

### Formula Design
1. **Start with templates** - Use pre-built templates as starting points
2. **Test thoroughly** - Test with all time periods before saving
3. **Use clear names** - KPI IDs should be descriptive
4. **Add descriptions** - Help others understand the metric
5. **Validate data** - Check for NULL values in SQL

### Performance
1. **Index fields** - Ensure filtered fields are indexed
2. **Limit JOINs** - Keep queries simple when possible
3. **Use appropriate periods** - Not all metrics need all periods
4. **Cache results** - System automatically caches KPI values

### Naming Conventions
- **KPI IDs**: `lowercase_with_underscores`
- **Display Names**: `Proper Case With Spaces`
- **Sections**: Use existing section IDs when possible

## Troubleshooting

### "Formula validation failed"
- Check for syntax errors in SQL/expression
- Ensure all field tokens use correct format: `@table.field`
- Verify table and field names exist

### "Test returned 0 or null"
- Check date filter is working: `{{dateFilter}}`
- Verify data exists for selected time period
- Check JOIN conditions are correct

### "Authentication required"
- Sign in to Supabase
- Check session hasn't expired
- Verify user has correct permissions

### "Field not found"
- Check field name spelling
- Verify table name is correct
- Ensure field exists in database schema

## Migration Guide

### Setting Up (First Time)

1. **Run Supabase Migration:**
   ```bash
   # In Supabase SQL Editor
   # Run: supabase-migrations/create-custom-kpis-table.sql
   ```

2. **Verify RLS Policies:**
   - Check policies are active in Supabase dashboard
   - Test with authenticated user

3. **Deploy Application:**
   ```bash
   npm run build
   npm run start
   ```

4. **Test Access:**
   - Navigate to `/kpis`
   - Sign in with admin credentials
   - Verify page loads correctly

## Future Enhancements

- [ ] Formula versioning and history
- [ ] Bulk import/export of custom KPIs
- [ ] Visual formula builder (drag-and-drop)
- [ ] Advanced aggregations (rolling averages, etc.)
- [ ] Formula scheduling and automation
- [ ] Multi-user collaboration
- [ ] KPI dependencies graph
- [ ] Performance analytics

## Support

For issues or questions:
1. Check validation errors in the UI
2. Review formula syntax in this guide
3. Test with simpler formulas first
4. Check browser console for detailed errors
5. Verify Supabase connection and authentication

---

**Version:** 1.0.0  
**Last Updated:** 2026-01-28
