# MySQL Migration - Quick Start Guide

## 🚀 Getting Started (3 Steps)

### Step 1: Add Environment Variable

Add to `.env.local`:

```bash
DATABASE_URL="mysql://<username>:<password>@<host>:<port>/<database>?ssl-mode=REQUIRED"
```

### Step 2: Test Connection

```bash
# Set a test email
export TEST_EMAIL="customer@example.com"

# Run test
npx ts-node --esm scripts/test-mysql-connection.ts
```

### Step 3: Start Development Server

```bash
npm run dev
```

**Look for:** `📊 Data Source: MySQL` in the console

## ✅ What to Verify

- [ ] Projects load on dashboard
- [ ] Project details page works
- [ ] Milestones display correctly
- [ ] Action items appear (VWC, SOW)
- [ ] Progress percentages are accurate

## 🔄 Rollback to Supabase

If you need to rollback, add to `.env.local`:

```bash
NEXT_PUBLIC_USE_MYSQL=false
```

Then restart: `npm run dev`

## 📚 Full Documentation

- **Setup Guide:** `docs/mysql-migration-guide.md`
- **Complete Summary:** `MYSQL_MIGRATION_SUMMARY.md`
- **Original Plan:** `mysql-database-migration.plan.md`

## 🎯 Key Points

- ✅ **Zero frontend changes** - All components work as before
- ✅ **Easy rollback** - Single environment variable
- ✅ **Type-safe** - Prisma generates TypeScript types
- ✅ **Secure** - SSL/TLS connection, credentials in .env
- ✅ **Documented** - Comprehensive guides included

## 📋 Testing Checklist

```bash
# 1. Test connection
npx ts-node --esm scripts/test-mysql-connection.ts

# 2. Check browser
# - Navigate to http://localhost:3000
# - Log in
# - Verify dashboard loads
# - Check project details
# - Verify action items

# 3. Check logs
# Look for:
# - "📊 Data Source: MySQL"
# - "Fetching projects for email: ..."
# - "Found X projects"
```

## 🐛 Quick Troubleshooting

**Problem:** Connection failed
- Check `DATABASE_URL` in `.env.local`
- Verify network access

**Problem:** No projects found
- Verify test email exists in database
- Check console for error messages

**Problem:** Type errors
- Run: `DATABASE_URL="mysql://..." npx prisma generate`
- Restart TypeScript server

## 📞 Need Help?

1. Check browser console logs
2. Check terminal logs
3. Review `docs/mysql-migration-guide.md`
4. Run test script with debug: `DEBUG=* npx ts-node scripts/test-mysql-connection.ts`

---

**Status:** ✅ Ready for Testing  
**Branch:** feature/foundational-updates  
**Last Updated:** November 17, 2024

