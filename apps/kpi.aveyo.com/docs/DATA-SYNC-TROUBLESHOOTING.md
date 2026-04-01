# Data Synchronization Troubleshooting Guide

## 🔍 Issue: Staging and Localhost Show Different Numbers

### Problem Description
When comparing the KPI dashboard between staging and localhost, the numbers (especially A/R card) show different values even after clicking "Refresh Data" on both environments.

---

## 🎯 Root Causes

### 1. **In-Memory Cache Per Instance** (Most Common)

**The Problem:**
- Each server instance maintains its own separate 15-minute in-memory cache
- Localhost has Cache Instance A
- Staging has Cache Instance B
- **Caches do NOT synchronize between instances**

**Example Timeline:**
```
2:00 PM - Staging fetches A/R data → $125,000 → caches until 2:15 PM
2:05 PM - Localhost fetches A/R data → $130,000 → caches until 2:20 PM
2:10 PM - Data in DB changes to $135,000
2:12 PM - User clicks "Refresh Data" on both:
          - Staging: Shows $125,000 (cache still valid until 2:15)
          - Localhost: Shows $130,000 (cache still valid until 2:20)
Result: Different values displayed!
```

**Solution:**
- Updated "Refresh Data" button now clears server-side cache **before** refetching
- This ensures fresh data from the database

---

### 2. **Different Database Connections**

**The Problem:**
- Staging and localhost might be configured to connect to different databases
- Check these environment variables:
  - `DB_HOST`
  - `DB_NAME`
  - `DB_PORT`
  - `DB_USER`

**How to Verify:**
1. Visit `/api/debug` on both environments
2. Compare `dbHost` and `dbName` values
3. If different → **This is your problem!**

**Solution:**
- Ensure both `.env.local` (localhost) and staging environment variables point to the **same database**

---

### 3. **Code Version Mismatch**

**The Problem:**
- Staging deployment might be on an older commit
- Different calculation logic or data sources

**How to Verify:**
```bash
# On localhost
git log --oneline -1

# Compare with staging deployment
# Check your deployment platform's current commit hash
```

**Solution:**
- Ensure staging is deployed from the same commit as localhost
- Redeploy if necessary

---

### 4. **Timezone Differences** (Affects Time-Filtered KPIs)

**The Problem:**
- Server timezone affects date calculations
- "Current Week" boundaries differ between timezones

**Example:**
```javascript
// This uses server's local time
const now = new Date();
const dayOfWeek = now.getDay();
```

- If staging server is in UTC (midnight) and localhost is in PST (4pm previous day)
- "Current Week" could start on different days

**How to Verify:**
1. Visit `/api/debug` on both environments
2. Compare `timezone` and `serverTime` values

**Solution:**
- Configure both servers to use UTC
- Or explicitly set timezone in date calculations (future enhancement)

---

## ✅ How to Ensure Data Sync

### Step 1: Use the Updated Refresh Button
The "Refresh Data" button now:
1. ✅ Clears server-side in-memory cache
2. ✅ Bypasses client-side cache with timestamp
3. ✅ Fetches fresh data from database

**Usage:**
- Click "Refresh Data" on **both** staging and localhost
- Wait for "Refreshing..." to complete
- Numbers should now match

---

### Step 2: Verify Environment Configuration

**On Localhost:**
```bash
# Check your .env.local file
cat .env.local | grep DB_
```

**On Staging:**
- Check your hosting platform's environment variables
- Vercel: Settings → Environment Variables
- Heroku: Settings → Config Vars
- AWS/Custom: Check your deployment config

**Expected:**
- Both should have **identical** `DB_HOST`, `DB_NAME`, `DB_PORT` values

---

### Step 3: Use the Debug Endpoint

**Visit on both environments:**
- Localhost: `http://localhost:3000/api/debug`
- Staging: `https://your-staging-url.com/api/debug`

**Compare:**
```json
{
  "environment": {
    "dbHost": "your-db-host:3306",  // ← Should match
    "dbName": "avyomkng",            // ← Should match
    "timezone": "America/Los_Angeles",
    "serverTime": "2025-12-16T10:30:00.000Z"
  }
}
```

---

### Step 4: Check Git Commits

**On Localhost:**
```bash
git log --oneline -5
```

**On Staging:**
- Check your deployment platform's current commit
- Should match localhost's latest commit

---

## 🔄 Ongoing Sync Strategy

### Option A: Manual Refresh (Current Implementation)
- Click "Refresh Data" button when you need latest data
- Clears cache and fetches fresh from database

### Option B: Shorter Cache Duration (If Needed)
If 15-minute cache is too long:

```typescript
// src/app/api/kpi/route.ts
const CACHE_DURATION = 5 * 60 * 1000; // Change to 5 minutes
```

⚠️ **Trade-off:** More database queries = higher load

### Option C: Shared Cache (Future Enhancement)
Replace in-memory cache with Redis:
- All instances share the same cache
- Automatic sync across environments
- Requires Redis infrastructure

---

## 🐛 Debug Checklist

When investigating data discrepancies:

- [ ] Click "Refresh Data" on **both** environments
- [ ] Wait for refresh to complete (spinner stops)
- [ ] Visit `/api/debug` on both environments
- [ ] Compare `dbHost` and `dbName` (should match)
- [ ] Compare `serverTime` (should be within seconds)
- [ ] Compare `timezone` (note any differences)
- [ ] Check git commit on both (should match)
- [ ] Open browser DevTools → Network tab
- [ ] Look for API responses with `"cached": true` vs `"cached": false`
- [ ] Compare raw API response values

---

## 📊 Example Debug Session

### Problem:
Staging shows A/R: $125,000 | Localhost shows A/R: $130,000

### Investigation:
```bash
# 1. Check localhost debug info
curl http://localhost:3000/api/debug
# Output: dbHost: "prod-db.example.com:3306", serverTime: "2025-12-16T10:30:00Z"

# 2. Check staging debug info
curl https://staging.example.com/api/debug
# Output: dbHost: "prod-db.example.com:3306", serverTime: "2025-12-16T10:30:05Z"

# ✅ Same database, times within 5 seconds → Likely cache issue

# 3. Click "Refresh Data" on both
# Result: Both now show $135,000 ✅
```

---

## 🔧 Recent Updates

### v1.2.0 - Enhanced Refresh Button
- **Before:** Only cleared client-side cache
- **After:** Clears both server-side AND client-side caches
- **Impact:** Guarantees fresh data on every refresh

### v1.2.1 - Added Debug Endpoint
- New `/api/debug` endpoint
- Shows environment config, timezone, database stats
- Helps diagnose sync issues

### v1.2.2 - Cache Metadata
- API responses now include `cached: true/false`
- Includes `timestamp` for each response
- Visible in browser DevTools → Network tab

---

## 📞 When to Escalate

If after following all steps above, data still doesn't match:

1. **Database Replication Lag**
   - If using read replicas, they may be behind master
   - Check replication status in your database admin panel

2. **CDN/Proxy Caching**
   - Some hosting platforms (Vercel, Cloudflare) add additional caching layers
   - Check your platform's cache settings
   - Try adding `Cache-Control: no-store` headers (nuclear option)

3. **Race Conditions**
   - If data is being updated frequently during your test
   - Try testing during a quiet period
   - Check database audit logs for recent changes

---

## ✅ Success Criteria

Data is properly synced when:
- ✅ Both environments show same numbers after refresh
- ✅ `/api/debug` shows same `dbHost` and `dbName`
- ✅ Network tab shows `"cached": false` after refresh
- ✅ Values match what you see in the database directly

---

## 📚 Related Documentation

- [Manual Refresh Feature](./MANUAL-REFRESH-FEATURE.md)
- [Cache Invalidation Strategy](./CACHE-INVALIDATION.md)
- [KPI Calculation Formulas](./KPI-VISUAL-SUMMARY.md)

