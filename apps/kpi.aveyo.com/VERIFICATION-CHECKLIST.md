# KPI Goals Integration - Verification Checklist

## ✅ System Status

### API Endpoints
- ✅ **GET /api/goals** - Successfully retrieving goals from Supabase
- ✅ **POST /api/goals** - Successfully saving goals to Supabase (Fixed RLS issue)
- ✅ **POST /api/kpi** - Successfully fetching KPI data with goals

### Recent Fixes Applied
1. ✅ **Service Role Key Integration** - Fixed RLS policy violation
2. ✅ **Cycle Time Goal Calculations** - Fixed inverse percentage for "lower is better" KPIs
3. ✅ **Input Background Styling** - Fixed dark background on input fields

---

## 🎯 KPIs with Goals Enabled

| KPI Name | KPI ID | Periods | Status |
|----------|--------|---------|--------|
| **Total Sales** | `total_sales` | Current Week, MTD, YTD | ✅ Active |
| **Installs Complete** | `installs_complete` | Current Week, Previous Week, MTD, YTD | ✅ Active |
| **Avg Days PP → Install** | `avg_days_pp_to_install` | Current Week, Previous Week, MTD | ✅ Active |
| **Avg Days Install → M2** | `avg_days_install_to_m2` | Previous Week, YTD | ✅ Active |
| **Avg Days PP → PTO** | `avg_days_pp_to_pto` | Previous Week, MTD, YTD | ✅ Active |
| **Total KW Scheduled** | `total_kw_scheduled` | Current Week, Next Week | ✅ Active |
| **Total KW Installed** | `total_kw_installed` | Current Week, Previous Week, MTD, YTD | ✅ Active |

**Total**: 7 KPIs with goal tracking enabled

---

## 🧪 Manual Testing Steps

### 1. Verify Goals Display on Dashboard
```bash
# Open dashboard
http://localhost:3000

# Expected Results:
✓ Total Sales card shows progress bar
✓ Installs Complete card shows progress bar
✓ Cycle time cards (Avg Days) show progress bars
✓ KW cards show progress bars
✓ Progress bars have correct colors (green/yellow/red)
✓ Percentage displays correctly
```

### 2. Verify Goals Management Page
```bash
# Open goals page
http://localhost:3000/goals

# Expected Results:
✓ Page loads without errors
✓ Login form appears if not authenticated
✓ After login, goal input fields appear
✓ Current goals load from Supabase
✓ Can edit goal values
✓ Save button works without errors
✓ Success message appears after save
```

### 3. Test Goal Updates
```bash
# 1. Change a goal value on /goals page
# 2. Click "Save Goals"
# 3. Wait 1 minute (for cache to expire)
# 4. Refresh dashboard (/)
# 5. Verify new goal value appears in KPI card
```

### 4. Test Different Time Periods
```bash
# On dashboard, cycle through time periods:
- Current Week
- Previous Week  
- Month to Date
- Year to Date
- Next Week (for KW Scheduled)

# Verify:
✓ Goals appear for appropriate periods
✓ KPIs without goals for that period don't show progress bar
✓ Percentages recalculate correctly
```

---

## 📊 Expected Goal Display Behavior

### For "Higher is Better" KPIs (Sales, Installs, KW)
```
If actual = 45 and goal = 50:
  Percentage = (45 / 50) × 100 = 90%
  Color = Yellow (between 70% and 90%)
  
If actual = 55 and goal = 50:
  Percentage = (55 / 50) × 100 = 110%
  Color = Green (>= 90%)
```

### For "Lower is Better" KPIs (Cycle Times)
```
If actual = 45 days and goal = 60 days:
  Percentage = (60 / 45) × 100 = 133%
  Color = Green (under goal is good)
  Status = Success
  
If actual = 75 days and goal = 60 days:
  Percentage = (60 / 75) × 100 = 80%
  Color = Yellow (slightly over goal)
  Status = Warning
```

---

## 🔍 Debugging Commands

### Check Supabase Goals Data
```sql
-- In Supabase SQL Editor:
SELECT * FROM goals ORDER BY kpi_id, period;
```

### Check API Response
```bash
# Fetch goals
curl http://localhost:3000/api/goals | jq

# Fetch KPI with goal
curl -X POST http://localhost:3000/api/kpi \
  -H "Content-Type: application/json" \
  -d '{"kpis":[{"kpiId":"total_sales","period":"current_week"}]}' | jq
```

### Check Browser Console
```javascript
// In browser console (F12):
// Should see goals loaded without errors
// Check network tab for /api/kpi responses
```

---

## 🚨 Common Issues & Solutions

### Issue: Goals not appearing on dashboard
**Solution**: 
1. Check that `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local`
2. Verify goals table has data in Supabase
3. Wait 1 minute for cache to clear
4. Hard refresh browser (Ctrl+Shift+R)

### Issue: "RLS policy violation" when saving
**Solution**: 
- ✅ **FIXED** - Service role client now used after authentication

### Issue: Progress bar shows wrong color
**Solution**:
- ✅ **FIXED** - Cycle time calculations now use inverse percentage

### Issue: Input fields have dark background
**Solution**:
- ✅ **FIXED** - Added CSS overrides in globals.css

---

## 📝 Environment Requirements

Make sure `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # ← Required for saving goals!

DB_HOST=xxx
DB_PORT=25060
DB_USER=xxx
DB_PASSWORD=xxx
DB_NAME=xxx
DB_SSL=true
```

---

## ✅ All Systems Operational

- ✅ Goals stored in Supabase
- ✅ Goals loaded with 1-minute cache
- ✅ 7 KPIs display goal progress
- ✅ Progress bars color-coded correctly
- ✅ Cycle times use inverse calculation
- ✅ Goals management page working
- ✅ Authentication required for edits
- ✅ RLS policies enforced properly

---

**Status**: 🟢 **READY FOR PRODUCTION**

**Last Verified**: December 16, 2025  
**Version**: 1.0.0
