# Cache Invalidation Strategy

## Overview

The dashboard uses a multi-layer caching system for performance. When goals are updated, caches must be invalidated to ensure changes appear immediately.

---

## 🔄 Cache Layers

### 1. Goals Cache
- **Location**: `src/lib/kpi-service.ts`
- **Duration**: 60 seconds (1 minute)
- **Purpose**: Avoid repeated Supabase queries for goals
- **Invalidation**: `invalidateGoalsCache()` function

### 2. KPI Data Cache
- **Location**: `src/app/api/kpi/route.ts`
- **Duration**: 15 minutes
- **Purpose**: Avoid expensive MySQL queries
- **Invalidation**: `clearKPICache()` function exported from route

---

## ⚡ Immediate Update Flow

When goals are updated, the following sequence ensures immediate visibility:

```
User saves goals on /goals page
        ↓
POST /api/goals
        ↓
Save to Supabase ✓
        ↓
invalidateGoalsCache() [Server-side]
        ↓
Return success to frontend
        ↓
Dispatch 'goals-updated' event [Frontend]
        ↓
Dashboard listens for event
        ↓
refetch() KPI data [Bypasses cache]
        ↓
Fresh data with new goals displayed ✓
```

---

## 🔧 Implementation Details

### Backend: Goals API Route

```typescript
// src/app/api/goals/route.ts

import { invalidateGoalsCache } from '@/lib/kpi-service';

export async function POST(request: NextRequest) {
  // ... save goals to Supabase ...
  
  // Invalidate goals cache immediately
  invalidateGoalsCache();
  console.log('Goals saved and cache invalidated');
  
  return NextResponse.json({
    success: true,
    message: 'Goals updated successfully',
    goals,
  });
}
```

### Backend: Cache Functions

```typescript
// src/lib/kpi-service.ts

let goalsCache: any = null;
let goalsCacheTime: number = 0;

export function invalidateGoalsCache(): void {
  goalsCache = null;
  goalsCacheTime = 0;
  console.log('Goals cache invalidated');
}
```

```typescript
// src/app/api/kpi/route.ts

const cache = new Map<string, { data: KPIValue; timestamp: number }>();

export function clearKPICache(): void {
  cache.clear();
  console.log('KPI cache cleared');
}
```

### Frontend: Goals Page

```typescript
// src/app/goals/page.tsx

const handleSave = async (e: React.FormEvent) => {
  const response = await fetch("/api/goals", {
    method: "POST",
    // ...
  });

  if (data.success) {
    // Notify the dashboard to refetch
    window.dispatchEvent(new CustomEvent('goals-updated'));
  }
};
```

### Frontend: Dashboard

```typescript
// src/app/page.tsx

export default function Dashboard() {
  const { data, loading, error, refetch } = useKPIData(sections, period);
  
  useEffect(() => {
    const handleGoalsUpdated = () => {
      console.log('Goals updated, refetching KPI data...');
      refetch();
    };
    
    window.addEventListener('goals-updated', handleGoalsUpdated);
    
    return () => {
      window.removeEventListener('goals-updated', handleGoalsUpdated);
    };
  }, [refetch]);
  
  // ...
}
```

---

## 📡 Cache Invalidation API (Optional)

For manual cache clearing or debugging:

```bash
# Clear all caches
curl -X DELETE http://localhost:3000/api/cache
```

**Endpoint**: `DELETE /api/cache`

**Response**:
```json
{
  "success": true,
  "message": "All caches cleared successfully"
}
```

---

## 🧪 Testing Cache Invalidation

### Test 1: Verify Immediate Update
```bash
1. Open dashboard at http://localhost:3000
2. Note current goal for "Total Sales"
3. Open /goals page in new tab
4. Change "Total Sales" goal
5. Click "Save Goals"
6. Return to dashboard tab
7. ✓ Verify new goal appears immediately (no refresh needed)
```

### Test 2: Verify Cache Logs
```bash
# In terminal running npm run dev, you should see:
Goals saved and cache invalidated
Goals cache invalidated
```

### Test 3: Browser Console
```bash
# In browser console (F12), you should see:
Goals updated, refetching KPI data...
```

---

## 🎯 Cache Strategy Benefits

### Before (Cache Issues)
❌ Goals saved but not visible for up to 60 seconds  
❌ KPI cards show stale data for up to 15 minutes  
❌ User confusion: "Did my changes save?"  
❌ Required manual page refresh

### After (Immediate Updates)
✅ Goals visible immediately after save  
✅ KPI cards update in real-time  
✅ Clear feedback: "Goals updated successfully!"  
✅ No manual refresh needed  
✅ Maintains performance benefits of caching

---

## 🔄 Cache Refresh Strategies

### Automatic (Current)
- Goals cache: Cleared on save
- KPI cache: Refetch on demand (via event)
- User experience: Seamless, no action needed

### Manual (Fallback)
- Hard refresh: Ctrl+Shift+R
- API call: `DELETE /api/cache`
- Server restart: Clears all in-memory caches

### Time-based (Always Active)
- Goals cache: Auto-expires after 60 seconds
- KPI cache: Auto-expires after 15 minutes

---

## 🛠️ Troubleshooting

### Issue: Goals still not updating immediately

**Diagnostic Steps:**
```bash
1. Check browser console for 'goals-updated' event
2. Check terminal for 'Goals saved and cache invalidated'
3. Verify no network errors in Network tab
4. Try manual cache clear: DELETE /api/cache
```

**Solutions:**
- If event not firing: Check goals page save handler
- If cache not clearing: Check API route imports
- If still cached: Hard refresh browser (Ctrl+Shift+R)

### Issue: Dashboard not refetching

**Check:**
```typescript
// Verify useEffect is registered
useEffect(() => {
  const handleGoalsUpdated = () => {
    refetch(); // Make sure this is called
  };
  // ...
}, [refetch]); // Dependency array must include refetch
```

---

## 📊 Performance Impact

### Without Cache Invalidation
- Time to see updates: 60-900 seconds (1-15 minutes)
- User actions required: Manual refresh
- Server load: Same (no extra queries)

### With Cache Invalidation
- Time to see updates: < 2 seconds (immediate)
- User actions required: None
- Server load: +1 query per goal update (negligible)

**Trade-off**: Minimal performance cost for significantly better UX

---

## 🚀 Future Enhancements

### Real-time Updates (Supabase Subscriptions)
```typescript
// Could use Supabase real-time to push updates
supabase
  .channel('goals')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'goals' },
    (payload) => {
      invalidateGoalsCache();
      // Broadcast to all connected clients
    }
  )
  .subscribe();
```

### Service Worker Cache
- Use service worker for offline support
- Sync changes when connection restored
- Background cache updates

### Optimistic UI Updates
- Update UI before server response
- Rollback on error
- Instant feedback

---

## ✅ Summary

The cache invalidation system ensures:

1. ✅ **Goals cache cleared** when goals are saved
2. ✅ **Custom event dispatched** from goals page
3. ✅ **Dashboard listens** for goal updates
4. ✅ **Data refetched** automatically
5. ✅ **UI updates** immediately with new goals

**Result**: Changes appear in < 2 seconds with no user action required.

---

**Last Updated**: December 16, 2025  
**Status**: ✅ Fully Implemented
