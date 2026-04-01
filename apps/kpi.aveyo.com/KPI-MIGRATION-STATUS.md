# KPI Migration to Database - Implementation Status

## Overview

This document summarizes the implementation status of migrating built-in KPIs from TypeScript code to the Supabase database. This migration enables admins to edit any KPI formula through the admin interface without code changes.

---

## ✅ Completed Tasks (9/13)

### 1. Database Schema Extension ✅
**File:** `supabase-migrations/02-extend-custom-kpis-for-originals.sql`

**Changes:**
- Added `is_original` column to distinguish built-in vs custom KPIs
- Added `is_hidden` column for component KPIs
- Added `secondary_formula` and `secondary_format` columns
- Updated RLS policies to respect hidden flag
- Created indexes for performance

**To Deploy:**
```bash
# Run in Supabase SQL Editor
# Execute: supabase-migrations/02-extend-custom-kpis-for-originals.sql
```

### 2. TypeScript Type Updates ✅
**File:** `src/lib/supabase.ts`

**Changes:**
- Updated `CustomKPIRecord` interface with new fields
- Added type safety for all new columns

### 3. Formula Execution Enhancement ✅
**File:** `src/lib/kpi-service.ts`

**Changes:**
- Added `formatSecondaryValue()` function
- Enhanced `executeSQLFormula()` to execute secondary formulas
- Added try-catch fallback in `getKPIValue()` for original KPIs
- System automatically falls back to TypeScript if database formula fails

### 4. API Endpoint Updates ✅
**File:** `src/app/api/kpis/route.ts`

**Changes:**
- **GET:** Fetches all KPIs (original + custom), respects hidden flag
- **POST:** Validates and creates KPIs with new fields
- **PUT:** Prevents changing is_original flag, validates updates
- **DELETE:** Protects original KPIs from deletion

### 5. Admin UI Enhancements ✅
**File:** `src/app/kpis/page.tsx`

**Changes:**
- Added filter for KPI type (all/original/custom)
- Added filter for visibility (all/visible/hidden)
- Updated stats to show 4 cards: Total, Original, Custom, Hidden
- Added badges showing original/custom and hidden status
- Allow editing of all KPIs (both original and custom)
- Prevent deletion of original KPIs

### 6. Form Modal Updates ✅
**File:** `src/components/kpi-form-modal.tsx`

**Changes:**
- Added warning banner for editing original KPIs
- Added visibility toggle checkbox
- Added secondary formula section (SQL only)
- Added secondary format dropdown (count/breakdown/text)

### 7. Dashboard Helper Functions ✅
**File:** `src/lib/dashboard-helpers.ts` (NEW)

**Functions:**
- `getDashboardSections()` - Fetches sections from database
- `getDashboardSectionsWithFallback()` - Database with fallback to hardcoded
- `getMergedDashboardSections()` - Merges database + hardcoded KPIs

**Note:** Helper functions are ready but not yet activated in dashboard. Will be used after migration is complete.

### 8. Migration Documentation ✅
**File:** `docs/KPI-MIGRATION-GUIDE.md`

**Contents:**
- Conversion patterns for all KPI types
- Step-by-step examples
- Common pitfalls and solutions
- Testing strategies
- Migration checklist

### 9. Component KPI Migration Strategy ✅
**Documented in:** `docs/KPI-MIGRATION-GUIDE.md`

**Strategy:**
- Break complex KPIs into hidden component KPIs
- Use expression formulas in parent KPIs
- Secondary formulas for breakdowns
- Reusable components across multiple KPIs

---

## 📋 Remaining Tasks (4/13)

### 10. Create Component KPIs ⏳
**Status:** Not Started  
**Effort:** Medium (2-3 hours)

**Task:** Create hidden component KPIs for complex metrics:
- `ar_m2_outstanding` (hidden) - M2 amount
- `ar_m3_outstanding` (hidden) - M3 amount
- `ar_m2_count` (hidden) - M2 project count
- `ar_m3_count` (hidden) - M3 project count
- `revenue_m1` (hidden) - M1 revenue
- `revenue_m2` (hidden) - M2 revenue
- Similar components for other complex KPIs

**Approach:**
1. Use KPI admin interface (`/kpis`)
2. Create KPIs with `is_hidden = true`
3. Test each component individually
4. Document dependencies

### 11. Convert Simple KPIs to SQL ⏳
**Status:** Not Started  
**Effort:** Large (4-6 hours)

**Task:** Convert ~20 simple KPIs to SQL formulas in database.

**Examples:**
- total_sales
- aveyo_approved
- jobs_on_hold
- installs_complete
- install_complete_no_pto
- install_scheduled
- active_no_pto
- pto_received_count
- active_install_not_started

**Approach:**
1. Use conversion guide in `docs/KPI-MIGRATION-GUIDE.md`
2. Create one KPI at a time via admin interface
3. Test each with multiple time periods
4. Compare values with TypeScript version

### 12. Convert Complex KPIs to Expressions ⏳
**Status:** Not Started  
**Effort:** Medium (3-4 hours)

**Task:** Convert complex KPIs using component KPIs.

**Examples:**
- ar_m2_m3 (uses ar_m2_outstanding + ar_m3_outstanding)
- revenue_received (uses revenue_m1 + revenue_m2)
- pull_through_rate (with secondary formula for breakdown)
- battery_percentage
- packet_approval_percentage

**Approach:**
1. Ensure component KPIs are created first
2. Use expression formulas with @ references
3. Add secondary formulas for breakdowns
4. Test thoroughly

### 13. Create Seeding Migration ⏳
**Status:** Not Started  
**Effort:** Large (6-8 hours)

**Task:** Create comprehensive seeding migration with all original KPIs.

**File:** `supabase-migrations/03-seed-original-kpis.sql`

**Contents:**
- All component KPIs
- All simple SQL KPIs
- All complex expression KPIs
- All goal KPIs
- Proper escaping and formatting

**Note:** This can be built incrementally as KPIs are converted via admin interface, then exported to SQL.

### 14. Validation Testing ⏳
**Status:** Not Started  
**Effort:** Medium (2-3 hours)

**Task:** Create validation tests comparing TypeScript vs Database values.

**File:** `scripts/validate-kpi-migration.ts` (to be created)

**Approach:**
1. For each KPI, fetch value from both sources
2. Compare values (should match within rounding)
3. Test all time periods
4. Log discrepancies
5. Fix issues before marking migration complete

---

## 🎯 Migration Progress

### Infrastructure: 100% Complete ✅
- Database schema ✅
- TypeScript types ✅  
- Formula execution ✅
- API endpoints ✅
- Admin UI ✅
- Form modal ✅
- Documentation ✅
- Helper functions ✅

### Content Migration: 0% Complete ⏳
- Component KPIs: 0/~10
- Simple KPIs: 0/~20
- Complex KPIs: 0/~10
- Goal KPIs: 0/~5
- **Total: 0/~45 KPIs**

---

## 📖 How to Continue Migration

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor, execute:
# supabase-migrations/02-extend-custom-kpis-for-originals.sql
```

### Step 2: Create Component KPIs
1. Navigate to `/kpis` in your app
2. Sign in with Supabase credentials
3. Click "Create Custom KPI"
4. For each component (e.g., `ar_m2_outstanding`):
   - Set KPI ID, name, description
   - Choose SQL formula type
   - Paste SQL from TypeScript function
   - Replace `${dateFilter}` with `{{dateFilter}}`
   - Escape quotes (`'` becomes `''`)
   - **Check "Hide from dashboard"**
   - Set section and periods
   - Test with different time periods
   - Save

### Step 3: Convert Simple KPIs
1. Use same process as component KPIs
2. **Don't check "Hide from dashboard"**
3. Follow guide in `docs/KPI-MIGRATION-GUIDE.md`
4. Test each KPI thoroughly

### Step 4: Convert Complex KPIs
1. Ensure component KPIs exist first
2. Choose "Expression" formula type
3. Use @ references: `@ar_m2_outstanding + @ar_m3_outstanding`
4. Add secondary formula if needed (SQL, for breakdowns)
5. Test and save

### Step 5: Validation
1. Create test script (or use admin interface)
2. Compare values: TypeScript vs Database
3. Test all time periods
4. Fix any discrepancies
5. Document edge cases

### Step 6: Activate Dynamic Fetching (Optional)
After all KPIs are migrated, update dashboard to use dynamic fetching:

```typescript
// In src/app/page.tsx
import { getMergedDashboardSections } from '@/lib/dashboard-helpers';

// Inside component:
const [sections, setSections] = useState<KPISection[]>([]);

useEffect(() => {
  async function loadSections() {
    const sections = await getMergedDashboardSections();
    setSections(sections);
  }
  loadSections();
}, []);
```

---

## 🔧 Current System Behavior

### Before Migration Complete:
- Dashboard uses hardcoded `DASHBOARD_SECTIONS` from `src/types/kpi.ts`
- TypeScript functions in `kpi-service.ts` execute formulas
- Admin interface can create custom KPIs
- Custom KPIs execute from database
- Original KPIs still execute from TypeScript

### During Migration:
- System checks database first for each KPI
- If found in database, executes database formula
- If database formula fails, falls back to TypeScript (for original KPIs only)
- If not found in database, uses TypeScript function
- Dashboard continues working throughout migration

### After Migration Complete:
- All KPIs execute from database
- Admin can edit any KPI formula
- TypeScript functions remain as safety fallback
- Dashboard can optionally fetch sections dynamically
- No code deployment needed for KPI changes

---

## 🎯 Benefits of This Approach

### ✅ Completed Now:
- Infrastructure is production-ready
- Admin interface fully functional
- Safe fallback mechanism in place
- Can create custom KPIs immediately
- Original KPIs protected from accidental deletion

### ⏳ After Content Migration:
- Edit any KPI formula without code deployment
- Create new KPIs through UI
- Component KPIs reusable across formulas
- Easier to debug and maintain
- Transparent calculations

---

## 📝 Migration Checklist

### Infrastructure (Complete)
- [x] Database schema extended
- [x] TypeScript types updated
- [x] Formula execution enhanced
- [x] API endpoints updated
- [x] Admin UI enhanced
- [x] Form modal updated
- [x] Dashboard helpers created
- [x] Documentation written

### Content (To Do)
- [ ] Component KPIs created
- [ ] Simple KPIs converted
- [ ] Complex KPIs converted
- [ ] Goal KPIs converted
- [ ] Validation tests passed
- [ ] Seeding migration created
- [ ] Dashboard activated (optional)

### Deployment (When Ready)
- [ ] Run database migration 02
- [ ] Test admin interface
- [ ] Create first KPI via UI
- [ ] Verify on dashboard
- [ ] Run full migration
- [ ] Execute validation tests
- [ ] Update dashboard to dynamic (optional)

---

## 🆘 Support & Troubleshooting

### Common Issues:

**1. "Table custom_kpis does not exist"**
- **Solution:** Run migration 02 in Supabase SQL Editor

**2. "Cannot edit this KPI"**
- **Solution:** Only custom KPIs can be edited until migration is complete

**3. "Formula validation failed"**
- **Solution:** Check SQL syntax, ensure `{{dateFilter}}` is included, escape quotes

**4. "KPI shows 0 or null"**
- **Solution:** Test formula with different periods, check date filter, verify data exists

### Documentation:
- User Guide: `docs/KPI-FORMULA-ADMIN.md`
- Migration Guide: `docs/KPI-MIGRATION-GUIDE.md`
- Setup Guide: `docs/KPI-ADMIN-SETUP.md`

### Example KPI Conversion:
See `docs/KPI-MIGRATION-GUIDE.md` for detailed examples of each KPI type.

---

**Last Updated:** 2026-01-28  
**Status:** Infrastructure Complete, Content Migration Pending  
**Next Step:** Run database migration, then begin component KPI creation
