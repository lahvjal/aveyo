# KPI Formula Admin - Setup Guide

## Quick Setup Checklist

This guide walks you through setting up the KPI Formula Admin feature.

## Prerequisites

- ✅ Supabase project configured
- ✅ Supabase authentication enabled
- ✅ MySQL database connected
- ✅ Next.js application running

## Step-by-Step Setup

### 1. Database Migration

Run the SQL migration in your Supabase SQL Editor:

```bash
# Location: supabase-migrations/create-custom-kpis-table.sql
```

**What it does:**
- Creates `custom_kpis` table
- Sets up Row-Level Security (RLS) policies
- Creates indexes for performance
- Adds `updated_at` trigger

**Verify:**
```sql
-- Check table exists
SELECT * FROM custom_kpis LIMIT 1;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'custom_kpis';

-- Check policies
SELECT * FROM pg_policies 
WHERE tablename = 'custom_kpis';
```

### 2. Environment Variables

Ensure these are set in your `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MySQL Database
DB_HOST=your_mysql_host
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_mysql_database
```

### 3. Install Dependencies

No new dependencies needed! All features use existing packages.

### 4. Build and Test

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 5. Verify Installation

#### Test Database Schema API
```bash
curl http://localhost:3000/api/db-schema
```

**Expected Response:**
```json
{
  "success": true,
  "schema": {
    "timeline": [...],
    "project-data": [...],
    ...
  },
  "metadata": {
    "tableCount": 5,
    "totalFields": 150
  }
}
```

#### Test KPIs API
```bash
curl http://localhost:3000/api/kpis
```

**Expected Response:**
```json
{
  "success": true,
  "kpis": {
    "builtIn": [...],
    "custom": [],
    "total": 145
  }
}
```

#### Test Admin Page
1. Navigate to `http://localhost:3000/kpis`
2. You should see authentication prompt
3. Sign in with Supabase credentials
4. Admin dashboard should load

### 6. Create Your First Custom KPI

1. Go to `/kpis`
2. Click **"Create Custom KPI"**
3. Fill in the form:
   - KPI ID: `test_metric`
   - Name: `Test Metric`
   - Format: `number`
   - Formula Type: `SQL`
   - Formula:
     ```sql
     SELECT COUNT(*) as value
     FROM `timeline`
     WHERE `contract-signed` IS NOT NULL
       AND {{dateFilter}}
     ```
   - Section: `sales_stats`
   - Periods: Check all boxes

4. Click **"Test Formula"** → Select `current_week`
5. Verify result appears
6. Click **"Save KPI"**

### 7. Verify on Dashboard

1. Navigate to `/` (main dashboard)
2. Look for your new KPI in the Sales Stats section
3. It should display calculated values

## File Structure

New files created:

```
src/
├── app/
│   ├── api/
│   │   ├── db-schema/
│   │   │   └── route.ts          # Database schema API
│   │   └── kpis/
│   │       └── route.ts          # KPI CRUD API
│   └── kpis/
│       └── page.tsx              # Admin page
├── components/
│   ├── field-selector.tsx        # Field autocomplete dropdown
│   ├── formula-editor.tsx        # Formula editor with validation
│   ├── kpi-form-modal.tsx        # KPI create/edit form
│   └── field-reference-panel.tsx # Field reference sidebar
└── lib/
    └── formula-validator.ts      # Formula validation logic

supabase-migrations/
└── create-custom-kpis-table.sql  # Database migration

docs/
├── KPI-FORMULA-ADMIN.md          # Full documentation
└── KPI-ADMIN-SETUP.md            # This file
```

Modified files:

```
src/
├── components/
│   └── header.tsx                # Added KPI admin link
├── lib/
│   ├── kpi-service.ts            # Added custom KPI execution
│   └── supabase.ts               # Added custom_kpis types
```

## Troubleshooting

### Issue: "Table custom_kpis does not exist"

**Solution:** Run the migration in Supabase SQL Editor

### Issue: "Authentication required"

**Solution:** 
1. Check Supabase auth is configured
2. Sign in at `/kpis`
3. Verify session is active

### Issue: "Cannot read fields"

**Solution:**
1. Verify MySQL connection
2. Check table names in database
3. Test `/api/db-schema` endpoint

### Issue: "Formula validation failed"

**Solution:**
1. Check SQL syntax
2. Verify field tokens: `@table.field`
3. Ensure `{{dateFilter}}` is included in WHERE clause
4. Test with simpler formula first

### Issue: "Custom KPI not showing on dashboard"

**Solution:**
1. Refresh the dashboard page
2. Check KPI is marked as `is_active = true`
3. Verify `section_id` matches existing section
4. Check `available_periods` includes current period

## Testing Checklist

- [ ] Migration runs successfully
- [ ] `/api/db-schema` returns schema
- [ ] `/api/kpis` returns KPI list
- [ ] `/kpis` page loads with authentication
- [ ] Can create custom KPI
- [ ] Formula validation works
- [ ] @ autocomplete works in editor
- [ ] Field reference panel opens
- [ ] Formula templates load
- [ ] Formula testing works
- [ ] Can save custom KPI
- [ ] Custom KPI appears on dashboard
- [ ] Can edit custom KPI
- [ ] Can delete custom KPI
- [ ] Header navigation link works

## Security Verification

### RLS Policies
```sql
-- Test: Unauthenticated read (should work for active KPIs)
SELECT * FROM custom_kpis WHERE is_active = true;

-- Test: Unauthenticated write (should fail)
INSERT INTO custom_kpis (...) VALUES (...);

-- Test: Authenticated write (should work when signed in)
-- Sign in first, then:
INSERT INTO custom_kpis (...) VALUES (...);
```

### Formula Validation
Test that dangerous keywords are blocked:
- ❌ `DROP TABLE`
- ❌ `DELETE FROM`
- ❌ `ALTER TABLE`
- ❌ `TRUNCATE`
- ❌ `LOAD_FILE`

## Performance Checks

1. **Database Schema Load Time**
   - Should be < 500ms
   - Cached after first load

2. **KPI List Load Time**
   - Should be < 1s for 100+ KPIs
   - Filtered efficiently

3. **Formula Execution**
   - Simple queries: < 100ms
   - Complex queries with JOINs: < 500ms

## Next Steps

1. **Create Common KPIs**
   - Use templates to create frequently-used metrics
   - Document custom formulas for your team

2. **Train Users**
   - Share documentation
   - Walk through creating a simple KPI
   - Explain formula syntax

3. **Monitor Usage**
   - Check for slow queries
   - Optimize frequently-used formulas
   - Add indexes as needed

4. **Backup Strategy**
   - Export custom KPIs regularly
   - Document critical formulas
   - Version control migrations

## Support Resources

- **Documentation**: `/docs/KPI-FORMULA-ADMIN.md`
- **Supabase Dashboard**: Check logs and policies
- **Browser Console**: Debug client-side issues
- **Server Logs**: Check API route errors

---

**Setup Version:** 1.0.0  
**Last Updated:** 2026-01-28

## Quick Reference

### Useful Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Check TypeScript errors
npm run type-check

# Format code
npm run format
```

### Useful SQL Queries

```sql
-- List all custom KPIs
SELECT kpi_id, name, formula_type, is_active 
FROM custom_kpis 
ORDER BY created_at DESC;

-- Disable a custom KPI
UPDATE custom_kpis 
SET is_active = false 
WHERE kpi_id = 'your_kpi_id';

-- Count custom KPIs by type
SELECT formula_type, COUNT(*) 
FROM custom_kpis 
WHERE is_active = true 
GROUP BY formula_type;

-- Check recent changes
SELECT kpi_id, name, updated_at 
FROM custom_kpis 
WHERE updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;
```
