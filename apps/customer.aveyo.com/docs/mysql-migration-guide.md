# MySQL Migration Guide

## Overview

The Aveyo Customer Portal now supports MySQL as the primary data source for project information, while maintaining Supabase for authentication and Ava AI features.

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# MySQL Database (Digital Ocean)
DATABASE_URL="mysql://<username>:<password>@<host>:<port>/<database>?ssl-mode=REQUIRED"

# Feature Flag (Optional - defaults to MySQL)
# Set to false to use Supabase instead
NEXT_PUBLIC_USE_MYSQL=true

# Supabase (Keep for Auth and Ava AI)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Install Dependencies

Dependencies are already installed:
- `prisma` - Database toolkit
- `@prisma/client` - Type-safe database client
- `mysql2` - MySQL driver

### 3. Generate Prisma Client

After any schema changes, regenerate the Prisma client:

```bash
DATABASE_URL="mysql://..." npx prisma generate
```

## Architecture

### Data Flow

```
Frontend Components
  ↓
/lib/data-service.ts (Feature Flag)
  ↓
/lib/mysql/data-service.ts (MySQL) OR /lib/supabase/data-service.ts (Supabase)
  ↓
Prisma Client → MySQL Database
```

### Feature Flag

The system uses a feature flag to switch between MySQL and Supabase:

```typescript
// In .env.local
NEXT_PUBLIC_USE_MYSQL=true  // Use MySQL (default)
NEXT_PUBLIC_USE_MYSQL=false // Use Supabase
```

This allows for easy rollback if issues are encountered.

### File Structure

```
src/lib/
├── data-service.ts          # Main entry point with feature flag
├── mysql/
│   ├── client.ts            # Prisma client instance
│   ├── data-service.ts      # MySQL data queries
│   └── field-mapper.ts      # Maps MySQL → TypeScript types
└── supabase/
    ├── client.ts            # Supabase client (for auth)
    └── data-service.ts      # Supabase data queries (fallback)

prisma/
└── schema.prisma            # Database schema definition
```

## Database Schema

### Tables

1. **project-data** - Main project information
   - Primary key: `item_id`
   - Key fields: `email`, `projectId`, `customerName`, `address`, etc.

2. **timeline** - Milestone/progress data
   - Primary key: `item_id`
   - Relates to: `project-data.item_id`
   - Contains: All milestone dates and statuses

3. **customer-sow** - Statement of Work data
   - Primary key: `item_id`
   - Relates to: `project-data.item_id`
   - Contains: SOW approval status and links

## Field Mapping

The field mapper transforms MySQL data to match existing TypeScript interfaces:

### Project Mapping

| MySQL Field | TypeScript Field | Notes |
|------------|------------------|-------|
| `email` | `customer_email` | Customer identifier |
| `customerName` | Used in `name` | Project name |
| `fullAddress` | `address` | Full address |
| `systemSize` | `system_size` | System size in kW |
| `salesRepName` | `sales_reps.name` | Sales rep info |

### Milestone Mapping

| MySQL (timeline table) | TypeScript (milestone object) |
|-----------------------|------------------------------|
| `siteSurveyComplete` | `milestone['pre-approvals']['site-survey-complete']` |
| `ntpComplete` | `milestone['pre-approvals']['ntp-complete']` |
| `engineeringComplete` | `milestone['pre-approvals']['engineering-complete']` |
| `allPermitsComplete` | `milestone.approvals['pre-install-review-complete']` |
| `installAppointment` | `milestone.construction['install-appointment']` |
| `installComplete` | `milestone.construction['install-complete']` |
| `ahjInspectionComplete` | `milestone.construction['ahj-inspection-complete']` |
| `ptoReceived` | `milestone.energization['pto-received']` |
| `energizeCompleteDate` | `milestone.energization['energize-complete-date']` |

## Testing

### Test MySQL Connection

Run the test script to verify the connection and data retrieval:

```bash
# Set a test email
export TEST_EMAIL="customer@example.com"

# Run test
npx ts-node --esm scripts/test-mysql-connection.ts
```

### Expected Output

```
🧪 Testing MySQL Connection and Data Retrieval

Test 1: Checking database connection...
✅ MySQL database connected successfully

Test 2: Fetching projects for email: customer@example.com
✅ Successfully fetched 2 projects

📋 First Project Sample:
  - ID: 12345
  - Name: Solar Installation - John Doe
  - Address: 123 Main St, Phoenix, AZ 85001
  - Status: in_progress
  - Progress: 56%
  - Current Stage: Construction
  - Next Milestone: Installation Complete

Test 3: Fetching project by ID: 12345
✅ Successfully fetched project: Solar Installation - John Doe
  - Has Timeline Data: true
  - Milestone Sections: [ 'pre-approvals', 'approvals', 'construction', 'energization' ]

Test 4: Fetching action items for email: customer@example.com
✅ Successfully fetched 3 action items

📝 Action Items:
  1. Welcome Form (welcome_form)
     Status: completed | Due: 1/10/2024
  2. Customer SOW Approval (sow_approval)
     Status: pending | Due: 1/25/2024

✅ All tests completed successfully!
```

## Rollback Plan

If issues are encountered, you can easily rollback to Supabase:

### Option 1: Environment Variable

```bash
# In .env.local
NEXT_PUBLIC_USE_MYSQL=false
```

Then restart the development server:

```bash
npm run dev
```

### Option 2: Code Change

Edit `src/lib/data-service.ts` line 6:

```typescript
const USE_MYSQL = false; // Force Supabase
```

## Troubleshooting

### Connection Issues

**Error:** `MySQL connection failed`

**Solution:**
1. Verify `DATABASE_URL` in `.env.local` is correct
2. Check network access to Digital Ocean
3. Ensure SSL mode is set: `?ssl-mode=REQUIRED`

### Schema Changes

**Error:** `Prisma Client not found`

**Solution:**
```bash
DATABASE_URL="mysql://..." npx prisma generate
```

### Type Errors

**Error:** `Property 'milestone' does not exist`

**Solution:**
1. Ensure Prisma Client is generated
2. Restart TypeScript server in VSCode/Cursor
3. Check `@prisma/client` is imported correctly

## Monitoring

### Logs to Watch

The application logs data source on startup:

```
📊 Data Source: MySQL
```

or

```
📊 Data Source: Supabase
```

### Performance

Monitor query performance in the console:

```
Fetching projects for email: customer@example.com
Found 5 projects
Generated 8 action items
```

## Next Steps

1. ✅ MySQL connection configured
2. ✅ Prisma schema created
3. ✅ Data service implemented
4. ✅ Feature flag added
5. ⏳ Test with real customer emails
6. ⏳ Monitor performance in production
7. ⏳ Remove Supabase fallback (once stable)

## Support

For issues or questions:
- Check logs in browser console and server terminal
- Review Prisma documentation: https://www.prisma.io/docs
- Test connection with `scripts/test-mysql-connection.ts`

---

**Last Updated:** November 2024  
**Migration Status:** ✅ Complete - Ready for Testing

