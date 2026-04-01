# KPI RLS Policy Fix - Summary

## Problem
Even after running the RLS migration, creating custom KPIs still failed with:
```
new row violates row-level security policy for table "custom_kpis"
```

## Root Cause
The API endpoint was using the **anonymous Supabase client** (`supabase`) to insert/update/delete KPIs. 

While the endpoint was **verifying** that the user was authenticated (by checking the token), it wasn't actually **using** the authenticated user's context when making database operations.

For Supabase RLS policies to work correctly with INSERT/UPDATE/DELETE operations, the database client must carry the user's authentication token.

## The Fix

### Changed:
```typescript
// ❌ BEFORE: Using anon client (no auth context)
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
// ... verify user is authenticated ...
const { data, error } = await supabase  // ❌ Still using anon client!
  .from('custom_kpis')
  .insert({ ... });
```

### To:
```typescript
// ✅ AFTER: Create authenticated client with user's token
const { createClient } = await import('@supabase/supabase-js');
const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      Authorization: `Bearer ${token}`  // ✅ User's token included
    }
  }
});

// Verify auth
const { data: { user }, error: authError } = await authenticatedClient.auth.getUser();

// Use authenticated client for database operations
const { data, error } = await authenticatedClient  // ✅ RLS sees authenticated user!
  .from('custom_kpis')
  .insert({ ... });
```

## What Was Updated

**File**: `src/app/api/kpis/route.ts`

### POST Handler (Create KPI)
- ✅ Creates authenticated Supabase client with user's token
- ✅ Uses authenticated client for INSERT operations
- ✅ RLS policy now sees the authenticated user

### PUT Handler (Update KPI)
- ✅ Creates authenticated Supabase client with user's token
- ✅ Uses authenticated client for SELECT and UPDATE operations
- ✅ RLS policy now sees the authenticated user

### DELETE Handler (Delete KPI)
- ✅ Creates authenticated Supabase client with user's token
- ✅ Uses authenticated client for SELECT and UPDATE operations
- ✅ RLS policy now sees the authenticated user

## How RLS Works

Supabase Row-Level Security (RLS) checks the **authenticated user's context** when evaluating policies like:

```sql
CREATE POLICY "Authenticated can insert KPIs"
  ON custom_kpis FOR INSERT
  TO authenticated  -- ← RLS checks if the client is authenticated
  WITH CHECK (true);
```

**Before the fix:**
- API verified user was authenticated ✅
- But used anon client for database operations ❌
- RLS saw "anon" role, not "authenticated" role ❌
- Policy rejected the operation ❌

**After the fix:**
- API creates client with user's auth token ✅
- Client carries authentication context ✅
- RLS sees "authenticated" role ✅
- Policy allows the operation ✅

## Testing

Try creating your KPI again:
1. The form should still have your "Total Sales of All Time" KPI data
2. Click "Create KPI"
3. It should now succeed! ✅

## Why This Approach

**Alternative approaches considered:**

1. **Use service role key**: Would bypass RLS entirely (security risk)
2. **Disable RLS**: Would allow anyone to modify KPIs (security risk)
3. **Create authenticated client** ✅: Proper solution that respects RLS

We chose #3 because it:
- Maintains security (RLS still enforced)
- Proper separation of concerns (admin users have admin permissions)
- Future-proof (if we add user-specific policies later)

## Files Modified
- `src/app/api/kpis/route.ts` - Updated POST, PUT, DELETE handlers

## No Migration Required
This fix is **code-only**. The RLS policies from the previous migration are correct. The issue was with how the API was authenticating with the database.

---

**Your KPI creation should now work perfectly!** 🎉
