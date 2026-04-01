# Section Order Management Feature - Summary

## What Was Added

A drag-and-drop UI on the admin page that allows you to:
- ✅ **Reorder dashboard sections** - Change the order sections appear on the homepage
- ✅ **Show/hide sections** - Toggle section visibility on the dashboard
- ✅ **Persist changes** - Order is saved to Supabase and persists across sessions

## How to Use

### 1. Run the Migration

First, run the migration in Supabase SQL Editor:

```bash
# Copy and paste the contents of this file:
/Users/vel/Documents/Aveyo/apps/kpi.aveyo.com/supabase-migrations/05-create-section-order-table.sql
```

**Or manually:**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor"
4. Click "New Query"
5. Copy/paste the migration SQL
6. Click "Run"

### 2. Access the Section Manager

1. Navigate to http://localhost:3000/admin
2. You'll see a new "Dashboard Section Order" card
3. It shows all 7 sections with their current order

### 3. Reorder Sections

**Drag and Drop:**
- Click and hold the grip icon (⋮⋮) on any section
- Drag it up or down to reorder
- Drop it in the new position
- Numbers update automatically

**Show/Hide:**
- Click the eye icon (👁) to hide a section
- Click the crossed-out eye (👁‍🗨) to show it again
- Hidden sections won't appear on the main dashboard

**Save:**
- Click "Save Order" to persist changes
- Changes take effect immediately on the homepage
- Click "Reset" to undo unsaved changes

## Example Use Cases

### 1. Prioritize Operations
Move "Operations Stats" to the top:
1. Drag "Operations Stats" to position 1
2. Click "Save Order"
3. Homepage now shows Operations Stats first

### 2. Hide Unused Sections
If you don't use the Commercial section:
1. Click the eye icon on "Commercial Division"
2. Click "Save Order"
3. Commercial section no longer appears on homepage

### 3. Group Related Sections
Reorder to group financial sections together:
1. Drag "Residential Financials" next to "Finance"
2. Click "Save Order"

## Files Created/Modified

### New Files:
1. **`supabase-migrations/05-create-section-order-table.sql`**
   - Creates `section_order` table
   - RLS policies for public read, authenticated write
   - Seed data with default order

2. **`src/app/api/sections/route.ts`**
   - GET: Fetch section order
   - POST: Update section order (authenticated)

3. **`src/components/section-order-manager.tsx`**
   - Drag-and-drop UI component
   - Visibility toggle
   - Save/reset functionality

### Modified Files:
1. **`src/app/admin/page.tsx`**
   - Added Section Order Manager component

2. **`src/lib/dashboard-helpers.ts`**
   - Updated to fetch section order from database
   - Falls back to hardcoded order if database is empty

## Database Schema

```sql
CREATE TABLE section_order (
  id uuid PRIMARY KEY,
  section_id text UNIQUE NOT NULL,
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Default Data:**
| Section ID               | Display Order | Active |
|--------------------------|---------------|--------|
| sales_stats              | 1             | ✅     |
| operations_stats         | 2             | ✅     |
| cycle_times              | 3             | ✅     |
| residential_financials   | 4             | ✅     |
| active_pipeline          | 5             | ✅     |
| finance                  | 6             | ✅     |
| commercial               | 7             | ✅     |

## How It Works

### Dashboard Load Process:
1. **Dashboard fetches sections** via `getDashboardSections()`
2. **Queries `section_order` table** for display order
3. **Sorts sections** by `display_order` ASC
4. **Filters out** sections where `is_active = false`
5. **Renders sections** in the specified order

### Admin Page Process:
1. **Fetches section order** from `/api/sections`
2. **Displays in drag-drop list** with current order
3. **User reorders** by dragging sections
4. **Saves to database** via POST to `/api/sections`
5. **Dashboard reflects changes** immediately

## Features

### Security
- ✅ RLS policies protect the `section_order` table
- ✅ Only authenticated users can modify section order
- ✅ Public users can only read active sections

### User Experience
- ✅ Real-time visual feedback during drag
- ✅ Success/error notifications
- ✅ Reset button to undo unsaved changes
- ✅ Disabled save button when no changes
- ✅ Shows section count badges

### Persistence
- ✅ Changes saved to database
- ✅ Order persists across sessions
- ✅ Survives server restarts
- ✅ Synced across all users

## Testing

1. **Reorder sections**:
   - Drag "Finance" to position 1
   - Save
   - Visit homepage → Finance should be first

2. **Hide a section**:
   - Click eye icon on "Cycle Times"
   - Save
   - Visit homepage → Cycle Times should be gone

3. **Reset changes**:
   - Drag sections around
   - Click "Reset"
   - Order returns to last saved state

4. **Concurrent users**:
   - User A changes order
   - User B refreshes homepage
   - User B sees User A's changes

## Future Enhancements

Possible improvements:
- 📊 Add section-level analytics
- 🎨 Customize section colors/icons
- 📱 Mobile-optimized drag interface
- ⚡ Real-time sync across tabs
- 📋 Section templates/presets
- 🔒 Per-user custom ordering

---

**Your dashboard sections are now fully customizable!** 🎉
