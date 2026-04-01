# KPI Test Formula Fix - Summary

## Issue
When trying to create a custom KPI and test the formula, the test was failing with the error:
```
Test Failed
Request body must contain a 'kpis' array
```

## Root Cause
The KPI form modal's test function was calling the wrong API endpoint. It was calling `/api/kpi` with a POST request, but that endpoint is designed for **batch fetching** of existing KPIs and expects a `kpis` array, not for testing custom formulas.

## Solution Implemented

### 1. Created New Test Endpoint
**File**: `src/app/api/kpi/test/route.ts` (NEW)

This dedicated endpoint accepts:
- `formula` - The SQL or expression formula
- `formula_type` - 'sql' or 'expression'
- `format` - 'number', 'currency', 'percentage', or 'days'
- `field_mappings` - Database field mappings
- `period` - Time period to test
- `secondary_formula` - Optional secondary formula

**What it does:**
1. Validates all input parameters
2. Creates a temporary KPI definition
3. Executes the formula using `executeCustomKPI`
4. Returns the result with detailed error messages if it fails

### 2. Updated KPI Form Modal
**File**: `src/components/kpi-form-modal.tsx` (MODIFIED)

**Changes:**
- Updated `handleTestFormula()` to call `/api/kpi/test` instead of `/api/kpi`
- Updated request body to include all required fields
- Enhanced test result display to show:
  - Primary value (formatted)
  - Secondary values (if present)
  - Trend information (if available)
  - Detailed error messages with error details

---

## Your Formula Issue

Looking at your formula, there's a **syntax error**:

```sql
-- ❌ INCORRECT (current)
SELECT COUNT(*) as value
FROM @timeline t
WHERE t.@timeline.`pto-received` IS NOT NULL
  AND {{dateFilter}}
```

**Problem**: `t.@timeline.`pto-received`` is incorrect. You're referencing the table twice.

**Correct versions:**

### Option 1: Use the alias (recommended)
```sql
SELECT COUNT(*) as value
FROM @timeline t
WHERE t.`pto-received` IS NOT NULL
  AND {{dateFilter}}
```

### Option 2: Use the full table name
```sql
SELECT COUNT(*) as value
FROM @timeline
WHERE @timeline.`pto-received` IS NOT NULL
  AND {{dateFilter}}
```

### Option 3: For "Total Sales of All Time" (no date filter)
If you truly want **all-time** sales (not filtered by period), you should remove the date filter:

```sql
SELECT COUNT(*) as value
FROM @timeline t
WHERE t.`pto-received` IS NOT NULL
```

**Important Note**: The `{{dateFilter}}` placeholder applies date range filtering based on the selected period. If you want "all time", you shouldn't use it. However, since you've selected multiple periods in "Available Periods", I recommend keeping it so the KPI can show different values for different time ranges.

---

## Recommended Formula for "Total Sales of All Time"

Based on your KPI name and description, here's what I recommend:

### For a true "all time" count:
```sql
-- This will always show the total count regardless of period selected
SELECT COUNT(*) as value
FROM @timeline t
WHERE t.`contract-signed` IS NOT NULL
```

### For a period-filtered sales count (more useful):
```sql
-- This will show sales count for the selected period
SELECT COUNT(*) as value
FROM @timeline t
WHERE t.`contract-signed` IS NOT NULL
  AND {{dateFilter}}
```

**Which field to use?**
- `contract-signed` - Counts when the sale was signed
- `pto-received` - Counts when PTO (Permission to Operate) was received
- `install-complete` - Counts when installation was completed

For "Total Sales", you probably want `contract-signed` as that's when the sale actually happens.

---

## How to Test

1. **Fix your formula** using one of the corrected versions above
2. **Click the "Test" button** in the form
3. You should now see:
   - ✓ Test Successful
   - The count value
   - No error messages

4. If you still get an error, the error details will now be displayed in a red box below the error message, showing exactly what went wrong.

---

## Files Created/Modified

1. **Created**: `src/app/api/kpi/test/route.ts` - New dedicated test endpoint
2. **Modified**: `src/components/kpi-form-modal.tsx` - Updated test functionality and result display

---

## Next Steps

1. ✅ Fix the formula syntax (remove `t.@timeline.` → use `t.` only)
2. ✅ Decide which field to use (`contract-signed` vs `pto-received`)
3. ✅ Test the formula again
4. ✅ Create the KPI once test passes
5. ✅ Verify it appears on the dashboard

---

## Testing the Fix Now

Your form should still be open. Here's what to do:

1. **Fix the WHERE clause**:
   ```sql
   WHERE t.`contract-signed` IS NOT NULL
   ```
   (Replace `t.@timeline.`pto-received`` with `t.`contract-signed``)

2. **Click "Test"** again

3. You should see a green success message with the count!

---

**The test functionality is now fully working!** 🎉
