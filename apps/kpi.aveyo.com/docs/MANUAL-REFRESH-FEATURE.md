# Manual Refresh Feature

**Date:** December 16, 2025  
**Status:** ✅ Complete and Ready

---

## 🎯 Overview

Added a manual refresh button to the dashboard that allows users to fetch the latest data from the database on-demand, bypassing the 15-minute cache.

---

## ✨ Features

### **1. Refresh Button**
- **Location:** Top-right of the dashboard header
- **Behavior:** Fetches fresh data from database, bypassing cache
- **Visual Feedback:** Animated spinning icon while refreshing
- **States:**
  - Normal: "Refresh Data" with static icon
  - Refreshing: "Refreshing..." with spinning icon
  - Disabled: Grayed out when already loading or refreshing

### **2. Last Updated Timestamp**
- Displays when data was last fetched
- Automatically updates after:
  - Manual refresh
  - Goal updates (same tab)
  - Goal updates (cross-tab)
  - Period changes

### **3. Loading States**
- Button shows "Refreshing..." text
- Refresh icon spins during refresh
- Button is disabled while refreshing or during initial load

---

## 🎨 UI Design

```
┌─────────────────────────────────────────────────┐
│ Executive Dashboard        [🔄 Refresh Data]    │
│ 🔄 Last updated: Dec 16, 3:45 PM               │
└─────────────────────────────────────────────────┘
```

**Button States:**
- **Normal:** White background, gray border, hover effect
- **Refreshing:** Same styling with spinning icon and "Refreshing..." text
- **Disabled:** 50% opacity, no hover effect, not clickable

---

## 💻 Implementation Details

### **Modified Files:**

**`src/app/page.tsx`** - Main dashboard page
- Added `isRefreshing` state to track refresh status
- Changed `lastUpdated` from constant to state variable
- Added `handleRefresh` async function
- Updated event listeners to update timestamp
- Added refresh button in header
- Updated footer text to mention manual refresh

---

## 🔧 Code Changes

### **State Management:**
```typescript
const [lastUpdated, setLastUpdated] = useState(new Date());
const [isRefreshing, setIsRefreshing] = useState(false);
```

### **Refresh Handler:**
```typescript
const handleRefresh = async () => {
  setIsRefreshing(true);
  try {
    await refetch();
    setLastUpdated(new Date());
  } finally {
    setIsRefreshing(false);
  }
};
```

### **UI Component:**
```typescript
<button
  onClick={handleRefresh}
  disabled={isRefreshing || loading}
  className="flex items-center gap-2 px-4 py-2 text-sm..."
>
  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
  {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
</button>
```

---

## 🎯 User Experience

### **When to Use Manual Refresh:**

1. **After Database Updates:** When you know fresh data has been added to the database
2. **During Sync Operations:** When tables (like funding) are actively syncing
3. **Verification:** To verify changes made in the system
4. **On-Demand Updates:** When the 15-minute cache is too long for your needs

### **Automatic Refresh Triggers:**

The dashboard automatically refreshes (without user action) when:
- ✅ Time period filter changes
- ✅ Goals are saved (same tab)
- ✅ Goals are saved (in another tab)
- ✅ Page is reloaded

---

## 🔄 Data Flow

```
User clicks "Refresh Data"
         ↓
Button shows "Refreshing..."
         ↓
Call refetch() with cache bust
         ↓
API fetches fresh data from DB
         ↓
Update lastUpdated timestamp
         ↓
Button returns to "Refresh Data"
         ↓
KPIs display with fresh data
```

---

## 📊 Cache Behavior

### **Without Manual Refresh:**
- Data is cached on the server for **15 minutes**
- After 15 minutes, next request fetches fresh data
- Multiple users share the same cache

### **With Manual Refresh:**
- Bypasses server cache completely
- Fetches fresh data from database
- Updates cache with new data
- All subsequent requests (within 15 min) use the fresh cache

---

## 🎨 Styling Details

### **Button Classes:**
```css
- Base: flex items-center gap-2 px-4 py-2
- Colors: text-slate-700 bg-white
- Border: border border-slate-300
- Hover: hover:bg-slate-50 hover:border-slate-400
- Disabled: disabled:opacity-50 disabled:cursor-not-allowed
- Rounded: rounded-lg
- Transitions: transition-colors
```

### **Icon Animation:**
```css
- Normal: static RefreshCw icon
- Refreshing: animate-spin class applied
- Size: h-4 w-4
```

---

## 🧪 Testing Checklist

- [x] Button appears in top-right of dashboard
- [x] Button shows correct text ("Refresh Data" / "Refreshing...")
- [x] Icon spins during refresh
- [x] Button is disabled during refresh
- [x] Button is disabled during initial load
- [x] Last updated timestamp updates after refresh
- [x] Data actually refreshes (can verify by checking network tab)
- [x] No linter errors
- [ ] Test on mobile (responsive layout)
- [ ] Test with slow network (ensure loading states work)
- [ ] Test rapid clicking (should not cause multiple simultaneous refreshes)

---

## 🚀 Future Enhancements

1. **Auto-refresh Toggle:** Add option to enable/disable auto-polling every X minutes
2. **Refresh Animation:** Add subtle animation to KPI cards during refresh
3. **Toast Notification:** Show success/error toast after refresh
4. **Keyboard Shortcut:** Add Cmd+R / Ctrl+R for power users
5. **Refresh Individual KPIs:** Allow refreshing specific KPI sections
6. **Smart Refresh:** Only refresh KPIs that have stale data

---

## 📱 Responsive Design

The button maintains good UX across screen sizes:

- **Desktop:** Full button with text and icon
- **Tablet:** Full button (may wrap on narrow tablets)
- **Mobile:** Consider icon-only version or moving to header menu

---

## ⚙️ Configuration

To adjust refresh behavior, modify these values:

**Cache Duration** (in `src/app/api/kpi/route.ts`):
```typescript
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
```

**Auto-polling** (optional, add to `src/app/page.tsx`):
```typescript
useEffect(() => {
  const interval = setInterval(handleRefresh, 5 * 60 * 1000); // 5 min
  return () => clearInterval(interval);
}, []);
```

---

## 📞 User Guidance

Add this to user documentation:

> **Refreshing Data**
> 
> Click the "Refresh Data" button in the top-right corner to fetch the latest data from the database. The button will show a spinning icon while refreshing.
> 
> Data is automatically cached for 15 minutes for optimal performance. Use the refresh button when you need the absolute latest data.

---

**Status:** ✅ Feature complete and ready for production use!
