# Goals Integration Status

## ✅ Integration Complete

All KPI goals are now being pulled from Supabase and displayed in the KPI cards.

---

## 📊 KPIs with Goals Enabled

The following KPIs display goal progress bars and percentages:

### 1. **Total Sales**
- **KPI ID**: `total_sales`
- **Periods**: Current Week, Month to Date, Year to Date
- **Goal Source**: Supabase `goals` table
- **Display**: Shows goal value, progress bar, and percentage
- **Calculation**: `(actual / goal) × 100%` (higher is better)

### 2. **Installs Complete**
- **KPI ID**: `installs_complete`
- **Periods**: Current Week, Previous Week, Month to Date, Year to Date
- **Goal Source**: Supabase `goals` table
- **Display**: Shows goal value, progress bar, and percentage
- **Calculation**: `(actual / goal) × 100%` (higher is better)

### 3. **Avg Days PP → Install Start**
- **KPI ID**: `avg_days_pp_to_install`
- **Periods**: Current Week, Previous Week, Month to Date
- **Goal Source**: Supabase `goals` table
- **Display**: Shows goal value, progress bar, and percentage
- **Calculation**: `(goal / actual) × 100%` (lower is better - INVERSE)
- **Status**: 
  - Green (success): actual ≤ goal
  - Yellow (warning): actual ≤ goal × 1.2
  - Red (danger): actual > goal × 1.2

### 4. **Avg Days Install → M2 Approved**
- **KPI ID**: `avg_days_install_to_m2`
- **Periods**: Previous Week, Year to Date
- **Goal Source**: Supabase `goals` table
- **Display**: Shows goal value, progress bar, and percentage
- **Calculation**: `(goal / actual) × 100%` (lower is better - INVERSE)
- **Status**: 
  - Green (success): actual ≤ goal
  - Yellow (warning): actual ≤ goal × 1.2
  - Red (danger): actual > goal × 1.2

### 5. **Avg Days PP → PTO**
- **KPI ID**: `avg_days_pp_to_pto`
- **Periods**: Previous Week, Month to Date, Year to Date
- **Goal Source**: Supabase `goals` table
- **Display**: Shows goal value, progress bar, and percentage
- **Calculation**: `(goal / actual) × 100%` (lower is better - INVERSE)
- **Status**: 
  - Green (success): actual ≤ goal
  - Yellow (warning): actual ≤ goal × 1.2
  - Red (danger): actual > goal × 1.2

### 6. **Total KW Scheduled**
- **KPI ID**: `total_kw_scheduled`
- **Periods**: Current Week, Next Week
- **Goal Source**: Supabase `goals` table
- **Display**: Shows goal value, progress bar, and percentage
- **Calculation**: `(actual / goal) × 100%` (higher is better)

### 7. **Total KW Installed**
- **KPI ID**: `total_kw_installed`
- **Periods**: Current Week, Previous Week, Month to Date, Year to Date
- **Goal Source**: Supabase `goals` table
- **Display**: Shows goal value, progress bar, and percentage
- **Calculation**: `(actual / goal) × 100%` (higher is better)

---

## 🔄 Data Flow

```
┌─────────────────────┐
│  Supabase Database  │
│   (goals table)     │
└──────────┬──────────┘
           │
           │ loadGoals()
           │ (with 1-min cache)
           ▼
┌─────────────────────┐
│  kpi-service.ts     │
│  - getGoal()        │
│  - getTotalSales()  │
│  - etc...           │
└──────────┬──────────┘
           │
           │ Returns KPIValue with:
           │ - goal
           │ - goalFormatted
           │ - percentToGoal
           │ - status
           ▼
┌─────────────────────┐
│   /api/kpi (POST)   │
│   Batch endpoint    │
└──────────┬──────────┘
           │
           │ Returns batch results
           ▼
┌─────────────────────┐
│  useKPIData hook    │
│  Fetches all KPIs   │
└──────────┬──────────┘
           │
           │ Passes data to
           ▼
┌─────────────────────┐
│   KPISection        │
│   Maps to cards     │
└──────────┬──────────┘
           │
           │ Renders
           ▼
┌─────────────────────┐
│     KPICard         │
│  - Shows goal       │
│  - Progress bar     │
│  - Percentage       │
└─────────────────────┘
```

---

## 🎯 Goal Display Logic

In `kpi-card.tsx`, goals are displayed when:

1. **`showGoal` prop is `true`** (set in `types/kpi.ts`)
2. **`data.goal` exists** (fetched from Supabase)
3. **`data.percentToGoal` is defined** (calculated in kpi-service)

### Progress Bar Colors

```typescript
// Higher is better (Sales, Installs, KW)
- Green:  percentToGoal >= 90%
- Yellow: percentToGoal >= 70%
- Red:    percentToGoal < 70%

// Lower is better (Cycle Times)
- Green:  actual <= goal (100%+)
- Yellow: actual <= goal × 1.2 (83%+)
- Red:    actual > goal × 1.2 (<83%)
```

---

## 💾 Caching Strategy

### Goals Cache
- **Location**: `kpi-service.ts` in-memory
- **TTL**: 60 seconds (1 minute)
- **Reason**: Goals don't change frequently, reduces DB load

### KPI Data Cache
- **Location**: `/api/kpi` route in-memory
- **TTL**: 15 minutes
- **Reason**: MySQL queries are expensive, balance freshness with performance

---

## 🔧 Recent Fixes

### 1. **Added Service Role Key Support** (Fixed RLS violation)
- API route now uses service role client for database writes
- Maintains authentication check before using elevated permissions
- Fixes "row violates row-level security policy" error

### 2. **Fixed Cycle Time Goal Calculations**
- For cycle time KPIs (avg_days_*), lower values are better
- Changed calculation from `(actual / goal)` to `(goal / actual)`
- Now shows 100%+ when under goal, <100% when over goal
- Progress bar correctly represents "on track" for cycle times

### 3. **Input Background Fix**
- Added CSS to override dark input backgrounds
- Uses `var(--background)` CSS variable
- Handles autofill states properly

---

## 📝 Default Goals (Fallback)

If Supabase connection fails, these defaults are used:

```typescript
{
  total_sales: {
    current_week: 50,
    previous_week: 50,
    mtd: 200,
    ytd: 2400,
  },
  installs_complete: {
    current_week: 40,
    previous_week: 40,
    mtd: 160,
    ytd: 1920,
  },
  avg_days_pp_to_install: {
    current_week: 60,
    previous_week: 60,
    mtd: 60,
  },
  avg_days_install_to_m2: {
    previous_week: 30,
    ytd: 30,
  },
  avg_days_pp_to_pto: {
    previous_week: 90,
    mtd: 90,
    ytd: 90,
  },
  total_kw_scheduled: {
    current_week: 500,
    next_week: 500,
  },
  total_kw_installed: {
    current_week: 400,
    previous_week: 400,
    mtd: 1600,
    ytd: 19200,
  },
}
```

---

## ✅ Testing Checklist

To verify goals are working:

- [ ] Navigate to http://localhost:3000
- [ ] Select "Current Week" period
- [ ] Verify "Total Sales" card shows goal progress
- [ ] Verify "Installs Complete" card shows goal progress
- [ ] Select "Previous Week" period
- [ ] Verify "Avg Days" cards show goal progress
- [ ] Change time periods and verify goals update
- [ ] Go to /goals page and update a goal
- [ ] Wait 1 minute for cache to expire
- [ ] Verify updated goal shows on dashboard

---

## 🚀 Next Steps (Optional Enhancements)

1. **Real-time updates**: Use Supabase subscriptions to update goals instantly
2. **Historical tracking**: Store goal history for trend analysis
3. **Goal templates**: Create preset goals for different business scenarios
4. **Alert thresholds**: Custom alerts when KPIs fall below X% of goal
5. **Goal forecasting**: Predict if current pace will meet goals

---

**Last Updated**: December 16, 2025  
**Status**: ✅ Fully Operational
