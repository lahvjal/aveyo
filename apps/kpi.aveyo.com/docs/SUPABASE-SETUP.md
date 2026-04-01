# Supabase Setup Guide

This guide will walk you through setting up Supabase for your KPI Dashboard.

## Step 1: Create a Supabase Project

1. Go to https://supabase.com
2. Sign in or create an account
3. Click "New Project"
4. Fill in the details:
   - **Name**: aveyo-kpi-dashboard
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for setup to complete

---

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, click **Settings** (gear icon)
2. Click **API** in the left sidebar
3. You'll see:
   - **Project URL** - Copy this
   - **anon public** key - Copy this
   - **service_role** key - Copy this (keep secret!)

---

## Step 3: Add Environment Variables

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Keep existing MySQL credentials
DB_HOST=your-mysql-host.ondigitalocean.com
DB_PORT=25060
DB_USER=your-mysql-username
DB_PASSWORD=your-mysql-password
DB_NAME=your-database-name
DB_SSL=true
```

---

## Step 4: Create the Goals Table

### Option A: SQL Editor (Recommended)

1. In Supabase dashboard, click **SQL Editor**
2. Click **New Query**
3. Paste this SQL:

```sql
-- Create goals table
CREATE TABLE public.goals (
  id BIGSERIAL PRIMARY KEY,
  kpi_id TEXT NOT NULL,
  period TEXT NOT NULL,
  value DECIMAL(10, 2) NOT NULL CHECK (value >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kpi_id, period)
);

-- Create index for faster queries
CREATE INDEX idx_goals_kpi_period ON public.goals(kpi_id, period);

-- Enable Row Level Security
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read goals
CREATE POLICY "Public goals read access"
  ON public.goals
  FOR SELECT
  USING (true);

-- Create policy: Only authenticated users can insert/update goals
CREATE POLICY "Authenticated goals write access"
  ON public.goals
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default goals from existing JSON
INSERT INTO public.goals (kpi_id, period, value) VALUES
  -- Total Sales
  ('total_sales', 'current_week', 50),
  ('total_sales', 'previous_week', 50),
  ('total_sales', 'mtd', 200),
  ('total_sales', 'ytd', 2400),
  -- Installs Complete
  ('installs_complete', 'current_week', 40),
  ('installs_complete', 'previous_week', 40),
  ('installs_complete', 'mtd', 160),
  ('installs_complete', 'ytd', 1920),
  -- Avg Days PP to Install
  ('avg_days_pp_to_install', 'current_week', 60),
  ('avg_days_pp_to_install', 'previous_week', 60),
  ('avg_days_pp_to_install', 'mtd', 60),
  -- Avg Days Install to M2
  ('avg_days_install_to_m2', 'previous_week', 30),
  ('avg_days_install_to_m2', 'ytd', 30),
  -- Avg Days PP to PTO
  ('avg_days_pp_to_pto', 'previous_week', 90),
  ('avg_days_pp_to_pto', 'mtd', 90),
  ('avg_days_pp_to_pto', 'ytd', 90),
  -- Total KW Scheduled
  ('total_kw_scheduled', 'current_week', 500),
  ('total_kw_scheduled', 'next_week', 500),
  -- Total KW Installed
  ('total_kw_installed', 'current_week', 400),
  ('total_kw_installed', 'previous_week', 400),
  ('total_kw_installed', 'mtd', 1600),
  ('total_kw_installed', 'ytd', 19200)
ON CONFLICT (kpi_id, period) DO NOTHING;
```

4. Click **Run** (or press Ctrl+Enter)
5. Verify: You should see "Success. No rows returned"

### Option B: Table Editor

1. Click **Table Editor** in sidebar
2. Click **Create a new table**
3. Configure:
   - **Name**: goals
   - Enable RLS
   - Add columns:
     - `id` (int8, primary key, auto-increment)
     - `kpi_id` (text, not null)
     - `period` (text, not null)
     - `value` (numeric, not null)
     - `created_at` (timestamptz, default now())
     - `updated_at` (timestamptz, default now())

---

## Step 5: Set Up Authentication

### Enable Email Authentication

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Find **Email** provider
3. Make sure it's **enabled**
4. Configure:
   - ✅ Enable email provider
   - ✅ Confirm email (recommended)
   - ✅ Secure email change

### Create Your Admin User

1. Go to **Authentication** > **Users**
2. Click **Add user** > **Create new user**
3. Fill in:
   - **Email**: your-email@example.com
   - **Password**: Choose a strong password
   - ✅ Auto Confirm User (check this for development)
4. Click **Create user**

---

## Step 6: Verify Setup

### Test Database Connection

Run this in SQL Editor:

```sql
SELECT * FROM public.goals LIMIT 5;
```

You should see your default goals.

### Test Authentication

1. Go to your dashboard: http://localhost:3000/goals
2. You should see a login form (if code is updated)
3. Use the email/password you created

---

## Architecture Overview

```
┌─────────────────┐
│   Browser       │
│   (Next.js)     │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Supabase│
    │  Client │
    └────┬────┘
         │
    ┌────▼──────────────┐
    │   Supabase        │
    │   PostgreSQL      │
    │                   │
    │  ┌─────────────┐  │
    │  │ goals table │  │
    │  └─────────────┘  │
    │                   │
    │  ┌─────────────┐  │
    │  │ auth.users  │  │
    │  └─────────────┘  │
    └───────────────────┘
```

---

## What Changes in Your App

### Before (JSON + Password)
- Goals in `/data/goals.json`
- Simple password check
- File system reads/writes

### After (Supabase)
- Goals in PostgreSQL database
- Real authentication with email/password
- Secure API calls
- Real-time capabilities
- Better scalability

---

## Security Features

✅ **Row Level Security (RLS)**
- Goals readable by anyone
- Only authenticated users can modify

✅ **Environment Variables**
- API keys in `.env.local` (not committed)
- Service role key for server-side only

✅ **Proper Authentication**
- Email verification
- Secure password hashing
- Session management

---

## Troubleshooting

### Error: "Missing Supabase environment variables"

**Solution**: Check your `.env.local` file has all three variables:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Error: "relation 'public.goals' does not exist"

**Solution**: Run the SQL from Step 4 in SQL Editor

### Error: "new row violates check constraint"

**Solution**: Make sure goal values are positive numbers (>= 0)

### Can't log in

**Solution**: 
1. Check user exists in Authentication > Users
2. Make sure email is confirmed
3. Try resetting password

---

## Next Steps

After setup is complete:
1. Restart your dev server: `npm run dev`
2. Navigate to http://localhost:3000/goals
3. Log in with your Supabase credentials
4. Update goals through the UI
5. Goals are now stored in Supabase!

---

## Optional: Backup Your Data

### Export current JSON goals

```bash
cp data/goals.json data/goals-backup.json
```

### Export from Supabase

```bash
# Install Supabase CLI first
npm install -g supabase

# Login
supabase login

# Export goals table
supabase db dump --table goals > goals-backup.sql
```

---

## Migration Checklist

- [ ] Created Supabase project
- [ ] Copied API keys to `.env.local`
- [ ] Created goals table with SQL
- [ ] Verified table exists in Table Editor
- [ ] Created admin user in Authentication
- [ ] Tested login works
- [ ] Updated code (done automatically)
- [ ] Restarted dev server
- [ ] Tested goals page works

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

**Need help?** Contact your development team or check the Supabase Discord community.



