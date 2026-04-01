# Goals Management Guide

## Overview

The KPI Dashboard now supports dynamic goal management through a web interface. No more hardcoded goals in the code!

## Features

- ✅ **Dynamic Goal Setting** - Update goals through a web UI
- ✅ **Password Protected** - Secure access to prevent unauthorized changes
- ✅ **Real-time Updates** - Changes apply immediately
- ✅ **Persistent Storage** - Goals stored in JSON file
- ✅ **Validation** - Input validation prevents invalid data
- ✅ **User-friendly Interface** - Clean, organized form layout

---

## Accessing Goals Management

### Option 1: Header Icon
1. Navigate to the dashboard (http://localhost:3000)
2. Click the **target icon** (🎯) in the header
3. You'll be taken to `/goals`

### Option 2: Direct URL
Navigate directly to: **http://localhost:3000/goals**

---

## Setting Goals

### Step 1: Authenticate
1. Enter the password (default: `aveyo2025`)
2. Click "Unlock"

### Step 2: Edit Goals
You'll see 7 KPI categories, each with multiple time periods:

1. **Total Sales**
   - Current Week, Previous Week, MTD, YTD

2. **Installs Complete**
   - Current Week, Previous Week, MTD, YTD

3. **Avg Days PP → Install**
   - Current Week, Previous Week, MTD

4. **Avg Days Install → M2**
   - Previous Week, YTD

5. **Avg Days PP → PTO**
   - Previous Week, MTD, YTD

6. **Total KW Scheduled**
   - Current Week, Next Week

7. **Total KW Installed**
   - Current Week, Previous Week, MTD, YTD

### Step 3: Save Changes
1. Click the "Save Goals" button at the bottom
2. Wait for confirmation message
3. Goals are immediately applied to the dashboard

---

## Password Configuration

### Default Password
The default password is: **aveyo2025**

### Changing the Password

#### Option 1: Environment Variable (Recommended)
Add to your `.env.local` file:
```env
GOALS_PASSWORD=your-secure-password-here
```

#### Option 2: Code Change
Edit `src/app/api/goals/route.ts`:
```typescript
const ADMIN_PASSWORD = process.env.GOALS_PASSWORD || 'your-new-password';
```

**⚠️ Important**: Never commit passwords to Git!

---

## File Structure

### Goals Storage
**Location**: `/data/goals.json`

**Format**:
```json
{
  "total_sales": {
    "current_week": 50,
    "previous_week": 50,
    "mtd": 200,
    "ytd": 2400
  },
  "installs_complete": {
    "current_week": 40,
    "previous_week": 40,
    "mtd": 160,
    "ytd": 1920
  },
  ...
}
```

### API Endpoints

#### GET /api/goals
**Purpose**: Retrieve all goals

**Response**:
```json
{
  "success": true,
  "goals": {
    "total_sales": { ... },
    ...
  }
}
```

#### POST /api/goals
**Purpose**: Update goals (requires password)

**Request**:
```json
{
  "password": "aveyo2025",
  "goals": {
    "total_sales": {
      "current_week": 60,
      ...
    },
    ...
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Goals updated successfully",
  "goals": { ... }
}
```

---

## How It Works

### 1. Storage
Goals are stored in `/data/goals.json` file:
- Persistent across server restarts
- Easy to backup
- Human-readable format
- Can be edited manually if needed

### 2. Caching
Goals are cached in memory for **1 minute**:
- Reduces file system reads
- Improves performance
- Automatically refreshes when updated

### 3. KPI Service Integration
The KPI service (`src/lib/kpi-service.ts`) automatically loads goals:
```typescript
const goal = await getGoal('total_sales', period);
```

### 4. Validation
API validates all inputs:
- KPI IDs must be valid
- Periods must be valid
- Values must be positive numbers
- Structure must match schema

---

## Troubleshooting

### Problem: Goals not updating on dashboard

**Solution 1**: Clear cache
- Wait 1 minute (cache TTL)
- Or restart the dev server

**Solution 2**: Check file permissions
```bash
ls -la data/goals.json
```

**Solution 3**: Check file contents
```bash
cat data/goals.json
```

### Problem: "Invalid password" error

**Solution**: Check your password
- Default is `aveyo2025`
- Check `.env.local` for GOALS_PASSWORD
- Password is case-sensitive

### Problem: Goals page not loading

**Solution**: Check dev server
```bash
npm run dev
```

### Problem: Changes not saving

**Solution**: Check console for errors
1. Open browser DevTools (F12)
2. Check Console tab
3. Look for error messages
4. Check Network tab for API request status

---

## API Testing

### Test GET endpoint
```bash
curl http://localhost:3000/api/goals
```

### Test POST endpoint
```bash
curl -X POST http://localhost:3000/api/goals \
  -H "Content-Type: application/json" \
  -d '{
    "password": "aveyo2025",
    "goals": {
      "total_sales": {
        "current_week": 55,
        "mtd": 220
      }
    }
  }'
```

---

## Manual Editing

You can also edit goals manually in the JSON file:

1. Open `/data/goals.json`
2. Edit values (must be valid JSON)
3. Save the file
4. Goals will be picked up automatically (within 1 minute due to cache)

**Example**:
```json
{
  "total_sales": {
    "current_week": 60,
    "mtd": 240
  }
}
```

---

## Security Considerations

### Current Implementation
- ✅ Password protection
- ✅ Server-side validation
- ✅ No client-side storage of password
- ✅ Password not exposed in UI

### Recommended for Production
- [ ] Replace simple password with proper authentication (OAuth, JWT)
- [ ] Add user roles (admin, viewer)
- [ ] Add audit log of changes
- [ ] Add HTTPS requirement
- [ ] Rate limiting on API endpoints
- [ ] Store passwords hashed

---

## Migration Notes

### Before (Hardcoded)
Goals were defined in `/src/lib/kpi-service.ts`:
```typescript
const GOALS = {
  total_sales: {
    current_week: 50,
    ...
  }
};
```

### After (Dynamic)
Goals loaded from `/data/goals.json`:
```typescript
const goal = await getGoal('total_sales', period);
```

**Benefits**:
- ✅ No code changes needed to update goals
- ✅ No server restart required
- ✅ User-friendly interface
- ✅ Changes tracked in JSON file
- ✅ Easy to backup and restore

---

## Backup and Restore

### Backup Goals
```bash
cp data/goals.json data/goals-backup-$(date +%Y%m%d).json
```

### Restore Goals
```bash
cp data/goals-backup-20251216.json data/goals.json
```

### Version Control
The `goals.json` file is committed to Git, so you can:
- See history of changes
- Revert to previous goals
- Track who changed what (with Git)

---

## Future Enhancements

Potential improvements:
- [ ] Add goal templates (aggressive, conservative, etc.)
- [ ] Import/export goals as CSV
- [ ] Compare actual vs goal over time (analytics)
- [ ] Email notifications when goals are changed
- [ ] Multiple goal sets (Q1, Q2, Q3, Q4)
- [ ] Forecast based on current pace
- [ ] Goal recommendations based on historical data

---

## Questions?

- **Where are goals stored?** → `/data/goals.json`
- **How often do they update?** → Immediately (with 1-minute cache)
- **Can I edit manually?** → Yes, edit the JSON file
- **Is it secure?** → Password protected (basic)
- **What if I forget the password?** → Check `.env.local` or reset in code
- **Can multiple users edit?** → Yes, but last save wins

---

**Built with ❤️ for Aveyo KPI Dashboard**



