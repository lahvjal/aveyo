# Supabase Integration - Quick Start

Your dashboard is now ready to use Supabase! Follow these steps to complete the setup.

## 🚀 Quick Setup (10 minutes)

### Step 1: Create Supabase Project (3 min)

1. Visit https://supabase.com
2. Sign in (or create free account)
3. Click **"New Project"**
4. Name it: `aveyo-kpi-dashboard`
5. Choose a strong database password
6. Select your region
7. Click **"Create new project"**
8. Wait 2-3 minutes for provisioning

### Step 2: Get API Keys (1 min)

1. In your project, go to **Settings** (⚙️ icon)
2. Click **API** in sidebar
3. Copy these three values:
   - **Project URL**
   - **anon public** key
   - **service_role** key (keep this secret!)

### Step 3: Add to Environment (1 min)

Add to your `.env.local` file:

```env
# Supabase (add these new lines)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Keep your existing MySQL config
DB_HOST=aveyo-podio-do-user-18015130-0.i.db.ondigitalocean.com
# ... rest of DB config
```

### Step 4: Create Database Table (2 min)

1. In Supabase, click **SQL Editor**
2. Click **"New Query"**
3. Copy and paste this SQL:

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

-- Index for performance
CREATE INDEX idx_goals_kpi_period ON public.goals(kpi_id, period);

-- Security
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Public read" ON public.goals FOR SELECT USING (true);

-- Only authenticated can write
CREATE POLICY "Auth write" ON public.goals FOR ALL USING (auth.uid() IS NOT NULL);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default goals
INSERT INTO public.goals (kpi_id, period, value) VALUES
  ('total_sales', 'current_week', 50),
  ('total_sales', 'previous_week', 50),
  ('total_sales', 'mtd', 200),
  ('total_sales', 'ytd', 2400),
  ('installs_complete', 'current_week', 40),
  ('installs_complete', 'previous_week', 40),
  ('installs_complete', 'mtd', 160),
  ('installs_complete', 'ytd', 1920),
  ('avg_days_pp_to_install', 'current_week', 60),
  ('avg_days_pp_to_install', 'previous_week', 60),
  ('avg_days_pp_to_install', 'mtd', 60),
  ('avg_days_install_to_m2', 'previous_week', 30),
  ('avg_days_install_to_m2', 'ytd', 30),
  ('avg_days_pp_to_pto', 'previous_week', 90),
  ('avg_days_pp_to_pto', 'mtd', 90),
  ('avg_days_pp_to_pto', 'ytd', 90),
  ('total_kw_scheduled', 'current_week', 500),
  ('total_kw_scheduled', 'next_week', 500),
  ('total_kw_installed', 'current_week', 400),
  ('total_kw_installed', 'previous_week', 400),
  ('total_kw_installed', 'mtd', 1600),
  ('total_kw_installed', 'ytd', 19200)
ON CONFLICT (kpi_id, period) DO NOTHING;
```

4. Click **Run** or press Ctrl+Enter
5. Verify: Should see "Success. No rows returned"

### Step 5: Create Admin User (2 min)

1. Click **Authentication** in sidebar
2. Click **Users**
3. Click **"Add user"** → **"Create new user"**
4. Enter:
   - **Email**: your-email@example.com
   - **Password**: Choose a strong password
   - ✅ Check "Auto Confirm User"
5. Click **"Create user"**

### Step 6: Restart & Test (1 min)

1. Restart your dev server:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. Open browser: http://localhost:3000/goals

3. Log in with your Supabase credentials

4. Update a goal and save

5. ✅ Done! You're now using Supabase!

---

## ✨ What Changed

### Before (JSON + Password)
- Goals in `/data/goals.json`
- Simple password: `aveyo2025`
- File system operations
- No real authentication

### After (Supabase)
- Goals in **PostgreSQL database**
- Real **email/password authentication**
- Secure API calls with JWT tokens
- Row Level Security (RLS)
- Scalable and production-ready

---

## 🎯 Key Benefits

✅ **Real Database**
- PostgreSQL (not JSON file)
- ACID compliance
- Better for production

✅ **Real Authentication**
- Email/password login
- Session management
- JWT tokens
- Secure by default

✅ **Better Security**
- Row Level Security
- API keys in environment
- Encrypted connections

✅ **Scalability**
- Handle more users
- Real-time capabilities
- Better performance

---

## 🔍 Verify Setup

### Check Database
```bash
# In Supabase SQL Editor
SELECT * FROM public.goals LIMIT 5;
```

Should show your goals.

### Check Authentication
```bash
# In Supabase: Authentication > Users
```

Should show your admin user.

### Check Dashboard
1. Go to http://localhost:3000
2. Dashboard should load (reading from Supabase)
3. Click target icon (🎯)
4. Should see login form

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` has all 3 variables
- Restart dev server after adding

### "relation 'public.goals' does not exist"
- Run the SQL from Step 4
- Check in Table Editor that `goals` table exists

### "Invalid login credentials"
- Check email/password in Authentication > Users
- Make sure "Auto Confirm User" was checked
- Try password reset

### Goals not loading
- Check browser console for errors (F12)
- Verify Supabase URL is correct
- Check API keys are valid

---

## 📚 Full Documentation

See `docs/SUPABASE-SETUP.md` for detailed documentation including:
- Architecture diagrams
- Security configuration
- Backup procedures
- Advanced features
- Migration notes

---

## 🎉 Success Checklist

- [ ] Supabase project created
- [ ] API keys copied to `.env.local`
- [ ] Goals table created (SQL ran successfully)
- [ ] Admin user created in Authentication
- [ ] Dev server restarted
- [ ] Can log in at /goals page
- [ ] Can update and save goals
- [ ] Goals appear on main dashboard

---

**All set! Your dashboard now uses Supabase for authentication and goal storage.** 🚀

Questions? Check `docs/SUPABASE-SETUP.md` for detailed help.



